import { OrderRepository } from '../repositories/order.repository';
import { CustomerRepository } from '../repositories/customer.repository';
import { OrderDetailRepository } from '../repositories/order-detail.repository';
import { ShippingAddress } from '../entities/order.entity';
import { Logger } from '@aws-lambda-powertools/logger';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
// import { AthenaClient, StartQueryExecutionCommand } from '@aws-sdk/client-athena';
import { ParquetSchema, ParquetWriter } from 'parquetjs';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { GlueClient, CreatePartitionCommand } from '@aws-sdk/client-glue';

// Define the structure expected by the Parquet writer again for clarity
export interface DenormalizedOrderRow {
    order_id: string;
    order_timestamp: number; // epoch millis
    customer_id: string;
    customer_name: string;
    address: string; // Formatted shipping address
    product_id: string;
    product_name: string;
    product_unit_price: number;
    quantity: number;
}

// Define config needed for the export process
interface ExportConfig {
    targetBucketName: string;
    glueDatabaseName: string;
    glueTableName: string;
    athenaWorkgroupName: string;
}

export class DataExportService {
    private orderRepository: OrderRepository;
    private customerRepository: CustomerRepository;
    private orderDetailRepository: OrderDetailRepository;
    private readonly logger: Logger;
    private readonly s3Client: S3Client;
    private readonly glueClient: GlueClient;
    private readonly dynamoTableName: string;

    // Inject dependencies and logger instance
    constructor(
        dynamoTableName: string,
        s3Client: S3Client,
        glueClient: GlueClient,
        logger: Logger // Inject logger instance
    ) {
        if (!dynamoTableName) {
            throw new Error("DynamoDB Table Name is required for DataExportService.");
        }
        this.dynamoTableName = dynamoTableName;
        this.s3Client = s3Client;
        this.glueClient = glueClient;
        this.logger = logger; // Use injected logger

        // Instantiate repositories
        this.orderRepository = new OrderRepository(this.dynamoTableName);
        this.customerRepository = new CustomerRepository(this.dynamoTableName);
        this.orderDetailRepository = new OrderDetailRepository(this.dynamoTableName);
    }

    // Keep the Parquet schema within the service
    private static readonly parquetSchema = new ParquetSchema({
        order_id: { type: 'UTF8' },
        order_timestamp: { type: 'TIMESTAMP_MILLIS' },
        customer_id: { type: 'UTF8' },
        customer_name: { type: 'UTF8' },
        address: { type: 'UTF8' },
        product_id: { type: 'UTF8' },
        product_name: { type: 'UTF8' },
        product_unit_price: { type: 'DOUBLE' },
        quantity: { type: 'INT32' },
    });

    // Keep helper function private within the service
    private formatAddress(address: ShippingAddress): string {
        return `${address.street}, ${address.city}, ${address.postalCode}, ${address.county ? address.county + ', ' : ''}${address.country}`;
    }

    /**
     * Fetches and transforms ONE page of order data for a given date.
     *
     * @param targetDate YYYY-MM-DD string for the target date.
     * @param pageSize The number of orders to fetch for this page.
     * @param orderNextToken The pagination token from the previous page of orders, or null/undefined to start.
     * @returns An object containing the transformed rows for the page (`items`) and the token for the next page (`nextOrderToken`).
     */
    async getDenormalizedOrderDataPage(
        targetDate: string,
        pageSize: number,
        orderNextToken?: string | null
    ): Promise<{ items: DenormalizedOrderRow[]; nextOrderToken: string | null }> {
        this.logger.debug(`Service: Fetching order page`, { targetDate, pageSize, hasToken: !!orderNextToken });

        // 1. Fetch a page of orders
        const orderPageResult = await this.orderRepository.findOrdersByDate(targetDate, pageSize, orderNextToken ?? undefined);
        const partialOrders = orderPageResult.items;
        const nextToken = orderPageResult.nextToken;
        this.logger.debug(`Service: Found orders in page`, { orderCount: partialOrders.length, hasMorePages: !!nextToken });

        if (partialOrders.length === 0) {
            // No orders found for this page (or date)
            return { items: [], nextOrderToken: null };
        }

        // 2. Get unique customer IDs *for this page*
        const uniqueCustomerIds = [...new Set(partialOrders.map(order => order.customerId!))];
        if (uniqueCustomerIds.length === 0) {
            this.logger.warn('Service: No customer IDs found in order page, skipping customer fetch');
            // Still return the next token so the loop can continue if needed, but items will be empty
            return { items: [], nextOrderToken: nextToken };
        }
        this.logger.debug(`Service: Found unique customer IDs for page`, { customerIdCount: uniqueCustomerIds.length });

        // 3. Fetch corresponding customer names
        this.logger.debug('Service: Batch fetching customer names for page...');
        const customerNameMap = await this.customerRepository.findCustomersNameByIds(uniqueCustomerIds);
        this.logger.debug(`Service: Fetched customer names for page`, { fetchedCount: customerNameMap.size });

        // 4. Process orders in the current page
        const transformedItems: DenormalizedOrderRow[] = [];
        this.logger.debug(`Service: Processing orders for details and transformation for page...`, { orderCount: partialOrders.length });

        for (const order of partialOrders) {
            const customer = customerNameMap.get(order.customerId!);
            if (!customer) { this.logger.warn(`Service: Customer name not found for page processing. Skipping order.`, { customerId: order.customerId, orderId: order.id }); continue; }
            if (!order.shippingAddress) { this.logger.warn(`Service: Shipping address missing for page processing. Skipping order.`, { orderId: order.id }); continue; }

            try {
                // 5. Fetch ALL details for this order
                const partialDetails = await this.orderDetailRepository.findDetailsByOrderId(order.id!);
                if (partialDetails.length === 0) { this.logger.warn(`Service: No order details found for page processing. Skipping order.`, { orderId: order.id }); continue; }

                for (const detail of partialDetails) {
                     if (detail.productId && detail.productName && detail.quantity !== undefined && detail.unitPrice !== undefined) {
                        const row: DenormalizedOrderRow = {
                            order_id: order.id!,
                            order_timestamp: new Date(order.orderDate!).getTime(),
                            customer_id: order.customerId!,
                            customer_name: customer.name,
                            address: this.formatAddress(order.shippingAddress),
                            product_id: detail.productId,
                            product_name: detail.productName,
                            product_unit_price: detail.unitPrice,
                            quantity: detail.quantity,
                        };
                        transformedItems.push(row);
                    } else { this.logger.warn(`Service: Incomplete detail data for page processing. Skipping detail.`, { orderId: order.id, detail: JSON.stringify(detail) }); }
                }
            } catch (fetchError: any) { this.logger.error(`Service: Error fetching order details during page processing. Skipping order.`, { orderId: order.id, errorName: fetchError.name, errorMessage: fetchError.message }); }
        }

        this.logger.debug(`Service: Finished processing page.`, { itemCount: transformedItems.length });
        // Return the transformed items for this page and the token for the *next* page of orders
        return { items: transformedItems, nextOrderToken: nextToken };
    }

    /**
     * Orchestrates the full export process.
     * Fetches data in pages, writes all pages to a single temporary Parquet file,
     * then uploads the completed file to S3.
     */
    async exportOrdersForDate(targetDate: string, config: ExportConfig): Promise<void> {
        this.logger.info("Service: Starting export process using paged fetch to temp file", { targetDate, config });

        const tempFilePath = path.join(os.tmpdir(), `export_${Date.now()}.parquet`);
        this.logger.debug('Writing parquet to temporary file', { tempFilePath });

        let parquetWriter = await ParquetWriter.openFile(DataExportService.parquetSchema,  tempFilePath);
        let orderPageToken: string | null = null;
        let totalRowsExported = 0;
        let isFirstPage = true;
        const pageSize = 100; // Or make configurable

        try {

            // 2. Loop through pages, fetch/process data, and write to temp file
            this.logger.info('Service: Starting paged data processing and writing to temp file...');
            do {
                const pageResult = await this.getDenormalizedOrderDataPage(targetDate, pageSize, orderPageToken);
                const batch = pageResult.items;
                orderPageToken = pageResult.nextOrderToken;

                if (isFirstPage && batch.length === 0) {
                    this.logger.info(`Service: No data found for date on first page. Exiting.`, { targetDate });

                    return; // Exit early
                }
                isFirstPage = false;

                if (batch.length > 0) {
                    this.logger.debug(`Service: Writing page/batch of ${batch.length} rows to temp file.`);
                    if (!parquetWriter) throw new Error("ParquetWriter became null unexpectedly during loop.");
                    for (const record of batch) {
                        await parquetWriter.appendRow(record as any);
                    }
                    totalRowsExported += batch.length;
                }

            } while (orderPageToken);

            // 3. Close writer and file stream after loop
            this.logger.info('Service: Finished writing all pages to temp file. Closing writer/stream...');
            if (!parquetWriter) throw new Error("ParquetWriter was null before final close.");

            await parquetWriter.close();
            this.logger.info('Service: Temp file writing complete.');

            // 4. Create a readable stream FROM the now complete temporary file
            this.logger.info('Creating readable stream from temp file for S3 upload...', { tempFilePath });
            const readFileStream = fs.createReadStream(tempFilePath);

            // Optional: Handle errors on the read stream
            readFileStream.on('error', (err) => {
                this.logger.error('Error reading from temporary file stream during S3 upload', { error: err });
            });

            // 5. Upload the FILE STREAM to S3
            const s3Key = `order_date=${targetDate}/orders_${Date.now()}.parquet`;
            this.logger.info(`Service: Uploading Parquet file stream to S3`, { bucket: config.targetBucketName, key: s3Key });
            const putObjectCommand = new PutObjectCommand({
                Bucket: config.targetBucketName,
                Key: s3Key,
                Body: readFileStream, // Pass the readable file stream directly
                ContentType: 'application/octet-stream'
            });
            await this.s3Client.send(putObjectCommand); // SDK handles streaming the body
            this.logger.info('Service: Successfully uploaded Parquet file stream to S3.');

            // 6. Run CREATE PARTITION (only if rows were actually exported)
            if (totalRowsExported > 0) {
                this.logger.info(`Service: Running CREATE PARTITION`, { database: config.glueDatabaseName, table: config.glueTableName, workgroup: config.athenaWorkgroupName });
                const createPartitionCommand = new CreatePartitionCommand({
                    DatabaseName: config.glueDatabaseName,
                    TableName: config.glueTableName,
                    PartitionInput: {
                        Values: [targetDate],
                        StorageDescriptor: {
                            Location: `s3://${config.targetBucketName}/order_date=${targetDate}/`,
                            InputFormat: 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat',
                            OutputFormat: 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat',
                            SerdeInfo: {
                                SerializationLibrary: 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe',
                            },
                            Columns: [
                                {
                                  "Name": "order_id",
                                  "Type": "string"
                                },
                                {
                                  "Name": "order_timestamp",
                                  "Type": "timestamp"
                                },
                                {
                                  "Name": "customer_id",
                                  "Type": "string"
                                },
                                {
                                  "Name": "customer_name",
                                  "Type": "string"
                                },
                                {
                                  "Name": "address",
                                  "Type": "string"
                                },
                                {
                                  "Name": "product_id",
                                  "Type": "string"
                                },
                                {
                                  "Name": "product_name",
                                  "Type": "string"
                                },
                                {
                                  "Name": "product_unit_price",
                                  "Type": "double"
                                },
                                {
                                  "Name": "quantity",
                                  "Type": "int"
                                }
                              ],

                        }
                    },
                
                });
                await this.glueClient.send(createPartitionCommand).catch(error => {
                    if(error.name !== 'AlreadyExistsException') {
                        this.logger.error('Service: Error creating partition', { errorName: error.name, errorMessage: error.message });
                        throw error;
                    }
                });
                this.logger.info(`Service: Created partition for date`, { date: targetDate });
            } else {
                this.logger.info('Service: Skipping CREATE PARTITION as no rows were exported.');
            }
            

            this.logger.info('Service: Order export process completed successfully.');

        } catch (error: any) {
             // Error Handling for temp file approach
             if (parquetWriter?.closed === false) { try { await parquetWriter.close(); } catch (closeErr) { this.logger.warn('Error closing parquet writer during cleanup', { closeError: closeErr }); } }


            this.logger.error('Service: Error during temp file export process (Fetch/Parquet/S3/Athena)', {
                errorName: error.name,
                errorMessage: error.message,
                errorStack: error.stack,
                targetDate: targetDate,
                config: config
            });
            throw error; // Re-throw the error
        } finally {
             // Cleanup the temporary file/directory
            try {
                fs.rmSync(tempFilePath, { recursive: true, force: true });
                this.logger.debug('Cleaned up temporary directory', { tempFilePath });
            } catch (cleanupError) {
                this.logger.warn('Failed to clean up temporary parquet directory', { tempFilePath: tempFilePath, error: cleanupError });
            }
        }
    }
} 
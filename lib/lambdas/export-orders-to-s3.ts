import { S3Client } from '@aws-sdk/client-s3';
import { GlueClient } from '@aws-sdk/client-glue'
import { DataExportService } from '../services/data-export.service';
import { Logger } from '@aws-lambda-powertools/logger';
import type { EventBridgeEvent, Context } from 'aws-lambda';

// Initialize AWS SDK clients (outside handler for reuse)
const s3Client = new S3Client({});
const glueClient = new GlueClient({});

// Initialize Logger
const logger = new Logger({ serviceName: 'exportOrdersToS3Lambda' });

// Environment variables - Fetch and validate all required ones
const DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;
const TARGET_BUCKET_NAME = process.env.TARGET_BUCKET_NAME;
const GLUE_DATABASE_NAME = process.env.GLUE_DATABASE_NAME;
const GLUE_TABLE_NAME = process.env.GLUE_TABLE_NAME;
const ATHENA_WORKGROUP_NAME = process.env.ATHENA_WORKGROUP_NAME;

// Define the expected shape of the 'detail' field in the EventBridge event
interface ExportOrdersDetail {
    date?: string; // Optional date string YYYY-MM-DD
}

// Define a potential detail-type
type ExportOrdersDetailType = 'Scheduled Event' | string; // Keep flexible

// Simplified Lambda handler function
export const exportOrdersToS3 = async (
    event: EventBridgeEvent<ExportOrdersDetailType, ExportOrdersDetail>,
    context: Context
): Promise<void> => {
    logger.addContext(context); // Add Lambda context
    logger.info('Handler: Received request to export orders', {
        eventId: event.id,
        eventSource: event.source,
        detailType: event['detail-type'],
        detail: event.detail // Log the detail payload for debugging
    });

    // Basic validation of essential output env vars
    if (!DYNAMODB_TABLE_NAME || !TARGET_BUCKET_NAME || !GLUE_DATABASE_NAME || !GLUE_TABLE_NAME || !ATHENA_WORKGROUP_NAME) {
        // Log error before throwing
        logger.error("Missing required OUTPUT environment variables", {
            DYNAMODB_TABLE_NAME: !!DYNAMODB_TABLE_NAME,
            TARGET_BUCKET_NAME: !!TARGET_BUCKET_NAME,
            GLUE_DATABASE_NAME: !!GLUE_DATABASE_NAME,
            GLUE_TABLE_NAME: !!GLUE_TABLE_NAME,
            ATHENA_WORKGROUP_NAME: !!ATHENA_WORKGROUP_NAME,
        });
        throw new Error("Missing required OUTPUT environment variables (TARGET_BUCKET_NAME, GLUE_DATABASE_NAME, GLUE_TABLE_NAME, ATHENA_WORKGROUP_NAME).");
    }

    // Instantiate the service (outside handler), injecting dependencies
    const dataExportService = new DataExportService(
        DYNAMODB_TABLE_NAME,
        s3Client,
        glueClient,
        logger // Pass the logger instance
    );

    // 1. Determine the target date (YYYY-MM-DD string)
    const targetDateString = event.detail.date || new Date().toISOString().split('T')[0];
    logger.info(`Handler: Determined target date`, { date: targetDateString });

    try {
        // 2. Call the service method to perform the export
        logger.info('Handler: Delegating export process to DataExportService', { targetDate: targetDateString });

        // Pass the required configuration to the service method
        await dataExportService.exportOrdersForDate(targetDateString, {
            targetBucketName: TARGET_BUCKET_NAME,
            glueDatabaseName: GLUE_DATABASE_NAME,
            glueTableName: GLUE_TABLE_NAME,
            athenaWorkgroupName: ATHENA_WORKGROUP_NAME,
        });

        logger.info('Handler: Export process completed successfully.');

    } catch (error: any) {
        // Log the error that bubbled up from the service
        logger.error('Handler: Error during order export process', {
            errorName: error.name,
            errorMessage: error.message,
            errorStack: error.stack, // Include stack for handler-level debugging
            targetDate: targetDateString // Include context
        });
        // Re-throw the error for standard Lambda error handling (retries, DLQ)
        throw error;
    }
};

// Add the .path property for CDK stack integration
exportOrdersToS3.path = __filename; 
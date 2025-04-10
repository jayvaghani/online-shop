import {
    shipmentConfirmationTemplate,
    shipmentApprovalRequestTemplate, 
    shipmentRejectedTemplate, 
    orderReceivedEmailTemplate, 
    dailyOrderReportTemplate, 
    dailyOrderNotificationTemplate, 
    feedbackRequestEmailTemplate
} from "../../templates"

import { Logger } from '@aws-lambda-powertools/logger';
import { Order, ShippingAddress } from '../entities/order.entity'; // Assuming Order entity definition path
import { OrderDetail } from '../entities/order-detail.entity'; // Assuming OrderDetail entity definition path


// Interface for customer details needed for email (can be shared)
interface CustomerEmailDetails {
    email: string;
    name: string;
}

// Interface for combined Order data needed by the template
interface OrderConfirmationTemplateData {
    order_id: string;
    customer_name: string;
    customer_email: string;
    shipping_address: string; // Formatted shipping address
    order_details: { product_name: string; quantity: number }[];
    total_amount: string; // Formatted total amount
}

// Interface for Shipment Confirmation template data
interface ShipmentConfirmationTemplateData {
    orderId: string;
    customerName: string;
    // Add trackingNumber, carrier, etc. if needed by template later
}

// Interface for Shipment Rejected template data
interface ShipmentRejectedTemplateData {
    orderId: string;
    customerName: string;
}

// Interface for Shipment Approval Request template data
interface ShipmentApprovalRequestTemplateData {
    orderId: string;
    customerName: string;
    approvalLambdaUrl: string;
    taskToken: string;
}

// Interface for Daily Report Order data
interface DailyReportOrderData {
    customerId: string;
    email: string;
    shippingAddress: string; // Assuming pre-formatted string
    productName: string;
    quantity: number;
    pricePerItem: string; // Formatted string
    totalPrice: string; // Formatted string
}

// Interface for Daily Order Report template data
interface DailyOrderReportTemplateData {
    currentDate: string;
    orders: DailyReportOrderData[];
    grandTotal: string; // Formatted string
}

// Interface for Daily Order Notification template data
interface DailyOrderNotificationTemplateData {
    currentDate: string;
    totalOrders: number;
    grandTotal: string; // Formatted string
    presignedURL: string;
}

// Interface for Feedback Request template data
interface FeedbackRequestTemplateData {
    customerName: string;
}

export class TemplateService {
    private readonly logger = new Logger({ serviceName: 'TemplateService' });

    constructor() {
    }

    /**
     * Prepares the HTML body for the order confirmation email.
     * @param orderData - The full order object including details.
     * @param customerDetails - The customer\'s name and email.
     * @returns The rendered HTML string for the email body.
     */
    public prepareOrderConfirmationEmail(
        orderData: Order & { details: OrderDetail[] },
        customerDetails: CustomerEmailDetails
    ): string {
        this.logger.info("Preparing order confirmation email body", { orderId: orderData.id });

        if (!orderReceivedEmailTemplate) {
            this.logger.error("Order confirmation template is not compiled. Cannot prepare email body.", { orderId: orderData.id });
            throw new Error("Template configuration error: Order confirmation template not available.");
        }

        // Format data specifically for the template
        const templateData: OrderConfirmationTemplateData = {
            order_id: orderData.id,
            customer_name: customerDetails.name,
            customer_email: customerDetails.email,
            shipping_address: this.formatShippingAddress(orderData.shippingAddress),
            order_details: orderData.details.map(item => ({
                product_name: item.productName, // Map entity field to template field
                quantity: item.quantity,
                // price: item.price.toFixed(2) // Add if needed
            })),
            total_amount: orderData.totalAmount.toFixed(2),
        };

        try {
            const htmlBody = orderReceivedEmailTemplate(templateData);
            // const htmlBody = orderReceivedEmailTemplate(templateData);
            this.logger.info("Successfully rendered order confirmation email body", { orderId: orderData.id });
            return htmlBody;
        } catch (error) {
            this.logger.error("Error rendering order confirmation Handlebars template", { error: error as Error, orderId: orderData.id });
            throw new Error(`Failed to render email body: ${(error as Error).message}`);
        }
    }

    /**
     * Prepares the HTML body for the shipment confirmation email.
     * @param orderId - The ID of the order.
     * @param customerName - The customer's name.
     * @returns The rendered HTML string for the email body.
     */
    public prepareShipmentConfirmationEmail(
        orderId: string,
        customerName: string
    ): string {
        this.logger.info("Preparing shipment confirmation email body", { orderId });

        if (!shipmentConfirmationTemplate) {
            this.logger.error("Shipment confirmation template is not available.");
            throw new Error("Template configuration error: Shipment confirmation template unavailable.");
        }

        const templateData: ShipmentConfirmationTemplateData = { orderId, customerName };

        try {
            const htmlBody = shipmentConfirmationTemplate(templateData);
            this.logger.info("Successfully rendered shipment confirmation email body", { orderId });
            return htmlBody;
        } catch (error) {
            this.logger.error("Error rendering shipment confirmation template", { error: error as Error, orderId });
            throw new Error("Failed to render shipment confirmation email body.");
        }
    }

    /**
     * Prepares the HTML body for the shipment rejected email.
     * @param orderId - The ID of the order.
     * @param customerName - The customer's name.
     * @returns The rendered HTML string for the email body.
     */
    public prepareShipmentRejectedEmail(
        orderId: string,
        customerName: string
    ): string {
        this.logger.info("Preparing shipment rejected email body", { orderId });

        if (!shipmentRejectedTemplate) {
            this.logger.error("Shipment rejected template is not available.");
            throw new Error("Template configuration error: Shipment rejected template unavailable.");
        }

        const templateData: ShipmentRejectedTemplateData = { orderId, customerName };

        try {
            const htmlBody = shipmentRejectedTemplate(templateData);
            this.logger.info("Successfully rendered shipment rejected email body", { orderId });
            return htmlBody;
        } catch (error) {
            this.logger.error("Error rendering shipment rejected template", { error: error as Error, orderId });
            throw new Error("Failed to render shipment rejected email body.");
        }
    }

    /**
     * Prepares the HTML body for the shipment approval request email.
     * @param orderId - The ID of the order.
     * @param customerName - The customer's name.
     * @param approvalLambdaUrl - The URL of the approval Lambda function.
     * @param taskToken - The task token for the approval process.
     * @returns The rendered HTML string for the email body.
     */
    public prepareShipmentApprovalRequestEmail(
        orderId: string,
        customerName: string,
        approvalLambdaUrl: string,
        taskToken: string
    ): string {
        this.logger.info("Preparing shipment approval request email body", { orderId });

        if (!shipmentApprovalRequestTemplate) {
            this.logger.error("Shipment approval request template is not available.");
            throw new Error("Template configuration error: Shipment approval request template unavailable.");
        }

        const templateData: ShipmentApprovalRequestTemplateData = { orderId, customerName, approvalLambdaUrl, taskToken };

        try {
            const htmlBody = shipmentApprovalRequestTemplate(templateData);
            this.logger.info("Successfully rendered shipment approval request email body", { orderId });
            return htmlBody;
        } catch (error) {
            this.logger.error("Error rendering shipment approval request template", { error: error as Error, orderId });
            throw new Error("Failed to render shipment approval request email body.");
        }
    }

    /**
     * Prepares the HTML body for the daily order report email.
     * @param currentDate - The current date.
     * @param ordersData - The array of daily report order data.
     * @param grandTotal - The grand total of the daily orders.
     * @returns The rendered HTML string for the email body.
     */
    public prepareDailyOrderReport(
        currentDate: string,
        ordersData: DailyReportOrderData[],
        grandTotal: string
    ): string {
        this.logger.info("Preparing daily order report body", { date: currentDate, orderCount: ordersData.length });

        if (!dailyOrderReportTemplate) {
            this.logger.error("Daily order report template is not available.");
            throw new Error("Template configuration error: Daily order report template unavailable.");
        }

        const templateData: DailyOrderReportTemplateData = { currentDate, orders: ordersData, grandTotal };

        try {
            const htmlBody = dailyOrderReportTemplate(templateData);
            this.logger.info("Successfully rendered daily order report body", { date: currentDate });
            return htmlBody;
        } catch (error) {
            this.logger.error("Error rendering daily order report template", { error: error as Error, date: currentDate });
            throw new Error("Failed to render daily order report body.");
        }
    }

    /**
     * Prepares the HTML body for the daily order notification email.
     * @param currentDate - The current date.
     * @param totalOrders - The total number of orders.
     * @param grandTotal - The grand total of the daily orders.
     * @param presignedURL - The presigned URL for the daily order notification.
     * @returns The rendered HTML string for the email body.
     */
    public prepareDailyOrderNotification(
        currentDate: string,
        totalOrders: number,
        grandTotal: string, // Formatted
        presignedURL: string
    ): string {
        this.logger.info("Preparing daily order notification body", { date: currentDate });

        if (!dailyOrderNotificationTemplate) {
            this.logger.error("Daily order notification template is not available.");
            throw new Error("Template configuration error: Daily order notification template unavailable.");
        }

        const templateData: DailyOrderNotificationTemplateData = { currentDate, totalOrders, grandTotal, presignedURL };

        try {
            const htmlBody = dailyOrderNotificationTemplate(templateData);
            this.logger.info("Successfully rendered daily order notification body", { date: currentDate });
            return htmlBody;
        } catch (error) {
            this.logger.error("Error rendering daily order notification template", { error: error as Error, date: currentDate });
            throw new Error("Failed to render daily order notification body.");
        }
    }

    /**
     * Prepares the HTML body for the feedback request email.
     * @param customerName - The customer's name.
     * @returns The rendered HTML string for the email body.
     */
    public prepareFeedbackRequestEmail(
        customerName: string
    ): string {
        this.logger.info("Preparing feedback request email body", { customerName }); // Avoid logging PII like name if possible

        if (!feedbackRequestEmailTemplate) {
            this.logger.error("Feedback request email template is not available.");
            throw new Error("Template configuration error: Feedback request email template unavailable.");
        }

        const templateData: FeedbackRequestTemplateData = { customerName };

        try {
            const htmlBody = feedbackRequestEmailTemplate(templateData);
            this.logger.info("Successfully rendered feedback request email body", { customerName });
            return htmlBody;
        } catch (error) {
            this.logger.error("Error rendering feedback request template", { error: error as Error });
            throw new Error("Failed to render feedback request email body.");
        }
    }

    private formatShippingAddress(address: ShippingAddress): string {
        let formatted = `${address.street}, ${address.city}`;
        if (address.county) {
            formatted += `, ${address.county}`;
        }
        formatted += `, ${address.postalCode}, ${address.country}`;
        return formatted;
    }
} 
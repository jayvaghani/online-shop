import { Logger } from '@aws-lambda-powertools/logger';
import type { Context } from 'aws-lambda';
// OrderService handles fetching data and calling TemplateService/EmailService
import { OrderService } from '../services/order.service';
import { NotFoundError } from '../errors/not-found.error'; // Import specific errors for potential handling
import { ValidationError } from '../errors/validation.error'; // Import for input validation error

const logger = new Logger({ serviceName: 'sendShipmentConfirmationLambda' }); // Updated service name

// Instantiate OrderService outside the handler
// Requires TABLE_NAME, SENDER_EMAIL_ADDRESS env vars and DDB/SES permissions from CDK stack.
const orderService = new OrderService();

// Define the expected input event structure for this Lambda
interface SendShipmentConfirmationEvent {
    orderId: string;
    // Add trackingNumber, carrier, etc. if the template/service evolves to use them
    // trackingNumber?: string;
    // carrier?: string;
}

/**
 * Lambda handler function to send a shipment confirmation email for a given order ID.
 */
export const sendShipmentConfirmation = async (event: SendShipmentConfirmationEvent, context: Context): Promise<void> => {
    logger.addContext(context); // Add Lambda context to logs
    logger.info('Received request to send shipment confirmation email', { event }); // Updated log message

    // --- Input Validation ---
    if (!event || typeof event.orderId !== 'string' || event.orderId.trim() === '') {
        logger.error('Invalid input: Missing or invalid orderId in the event payload.', { event });
        // Signal failure to the trigger
        throw new ValidationError('Invalid input: Missing or invalid orderId.');
    }
    // Add validation for tracking details if they become required

    const { orderId /*, trackingNumber, carrier */ } = event; // Destructure if tracking info is added

    try {
        // --- Core Logic: Delegate to OrderService ---
        // Call the specific method for shipment confirmation emails
        await orderService.sendShipmentConfirmationEmail(orderId /*, { trackingNumber, carrier } */); // Pass tracking info if added

        logger.info('Successfully processed send shipment confirmation email request.', { orderId }); // Updated log message
        // Successful execution

    } catch (error: any) {
        // Log the error with details
        logger.error('Error processing send shipment confirmation request', { // Updated log message
            errorName: error.name,
            errorMessage: error.message,
            errorStack: error.stack,
            orderId: orderId,
        });

        // // Optional: Specific error handling
        // if (error instanceof NotFoundError) {
        //    // Order/Customer not found - maybe don't retry?
        // }

        // Re-throw the error for trigger handling (retries, DLQ)
        throw error;
    }
};

// Add the .path property for CDK stack integration
sendShipmentConfirmation.path = __filename; 
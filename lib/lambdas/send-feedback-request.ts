import { Logger } from '@aws-lambda-powertools/logger';
import type { Context } from 'aws-lambda';
import { OrderService } from '../services/order.service';
import { ValidationError } from '../errors/validation.error';

const logger = new Logger({ serviceName: 'sendFeedbackRequestLambda' }); // Unique service name

// Instantiate OrderService (requires TABLE_NAME, SENDER_EMAIL_ADDRESS env vars and DDB/SES permissions)
const orderService = new OrderService();

// Define expected input event structure
interface SendFeedbackRequestEvent {
    orderId: string;
    // Add other potential triggers/data if needed, e.g., customerId directly
}

/**
 * Lambda handler function to send a feedback request email for a given order ID.
 */
export const sendFeedbackRequest = async (event: SendFeedbackRequestEvent, context: Context): Promise<void> => {
    logger.addContext(context);
    logger.info('Received request to send feedback request email', { event }); // Updated log message

    // --- Input Validation ---
    if (!event || typeof event.orderId !== 'string' || event.orderId.trim() === '') {
        logger.error('Invalid input: Missing or invalid orderId.', { event });
        throw new ValidationError('Invalid input: Missing or invalid orderId.');
    }

    const { orderId } = event;

    try {
        // --- Core Logic: Delegate to OrderService ---
        await orderService.sendFeedbackRequestEmail(orderId);

        logger.info('Successfully processed send feedback request email request.', { orderId }); // Updated log message

    } catch (error: any) {
        logger.error('Error processing send feedback request', { // Updated log message
            errorName: error.name,
            errorMessage: error.message,
            errorStack: error.stack,
            orderId: orderId,
        });

        // Re-throw error for trigger handling
        throw error;
    }
};

// Add .path property for CDK
sendFeedbackRequest.path = __filename; 
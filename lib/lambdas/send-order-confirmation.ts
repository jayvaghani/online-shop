import { Logger } from '@aws-lambda-powertools/logger';
import type { Context } from 'aws-lambda';
// Assuming OrderService is correctly set up to handle email sending via TemplateService and EmailService
import { OrderService } from '../services/order.service';
import { ValidationError } from '../errors/validation.error'; // Import for input validation error
// import orderReceivedEmailTemplate from '../../templates/order-received-email.html';

const logger = new Logger({ serviceName: 'sendOrderConfirmationLambda' });

// Instantiate OrderService outside the handler
// This requires the Lambda's execution environment to have necessary env vars (TABLE_NAME, SENDER_EMAIL_ADDRESS)
// and permissions (DynamoDB access, SES send) defined in the CDK stack.
const orderService = new OrderService();

// Define the expected input event structure for this Lambda
// This might come from EventBridge, SQS, Step Functions, or direct invocation.
interface SendOrderConfirmationEvent {
    orderId: string;
    // Include other relevant details if available and useful from the trigger source
}

/**
 * Lambda handler function to send an order confirmation email for a given order ID.
 */
export const sendOrderConfirmation = async (event: SendOrderConfirmationEvent, context: Context): Promise<void> => {
    logger.addContext(context); // Add Lambda context to logs
    logger.info('Received request to send order confirmation email', { event });

    // --- Input Validation ---
    if (!event || typeof event.orderId !== 'string' || event.orderId.trim() === '') {
        logger.error('Invalid input: Missing or invalid orderId in the event payload.', { event });
        // Throwing an error signals failure to the trigger (e.g., SQS message goes back to queue/DLQ)
        throw new ValidationError('Invalid input: Missing or invalid orderId.');
    }

    const { orderId } = event;

    try {
        // --- Core Logic: Delegate to OrderService ---
        // The OrderService.sendOrderConfirmationEmail method handles:
        // 1. Fetching order and customer details.
        // 2. Preparing the email body using TemplateService.
        // 3. Sending the email using EmailService.
        await orderService.sendOrderConfirmationEmail(orderId);

        logger.info('Successfully processed send order confirmation email request.', { orderId });
        // Successful execution completes the Lambda invocation.

    } catch (error: any) {
        // Log the error with details
        logger.error('Error processing send order confirmation request', {
            errorName: error.name,
            errorMessage: error.message,
            errorStack: error.stack, // Be cautious logging full stack in production
            orderId: orderId,
        });

        // // Optional: Handle specific errors differently (e.g., NotFoundError)
        // if (error instanceof NotFoundError) {
        //     // Maybe don't retry if the order genuinely doesn't exist
        //     // Depending on the trigger, throwing might still be appropriate
        // }

        // Re-throw the error to indicate failure to the AWS Lambda service/trigger
        // This allows for automated retries (if configured) or DLQ processing.
        throw error;
    }
};

// Add the .path property for CDK stack integration, following convention
sendOrderConfirmation.path = __filename; 
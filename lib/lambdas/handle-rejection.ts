import { LambdaHandlerFunction } from '../types/lambda';
import { OrderService } from '../services/order.service'; // Import OrderService

// Updated interface: Expects original input fields + merged error details
interface RejectionEvent {
    orderId: string; // Expect orderId directly at the root
    customerEmail?: string; // If passed in original input
    // Add other original input fields if they exist
    ErrorDetails?: { // Optional field containing merged error info from Catch
        Cause?: string;
        Error?: string;
    }
}

// Instantiate services
const orderService = new OrderService();

export const handleRejection = async (event: RejectionEvent): Promise<void> => {
  console.log('Rejection Event (with merged error):', JSON.stringify(event, null, 2));

  // Extract orderId from the root of the event
  const orderId = event.orderId;

  if (!orderId) {
      // This check might be less likely to fail now, but kept for safety
      console.error('Order ID is missing from the event root.');
      throw new Error('Order ID could not be determined from the rejection event root.');
  }

  try {
      // Pass orderId to the service method
      await orderService.processRejection(orderId);
      console.log(`Successfully processed rejection for order ${orderId}`);
  } catch (error) {
      console.error(`Error processing rejection for order ${orderId}:`, error);
      // Re-throw the error to ensure the Lambda execution fails
      throw error;
  }
};

handleRejection.path = __filename
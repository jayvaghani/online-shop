import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { LambdaHandlerFunction } from '../types/lambda';
import { OrderService } from '../services/order.service'; // Import OrderService

// Instantiate services (outside handler for potential reuse and better testing)
const orderService = new OrderService();

export const handleApproval = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  console.log('Event:', JSON.stringify(event, null, 2));
  let statusCode = 200;
  let message = 'Processing completed.';

  try {
      /**
       * This is the ideal way to get the token and result from the query string.
       */
      // const token = event.queryStringParameters?.['token'];
      // const result = event.queryStringParameters?.['result']; // Should be 'approve' or 'reject'

      /**
       * This is the current way to get the token and result from the query string.
       * Since lambdaurl is passed inside the json and directly being emailed to the user,
       * we need to parse the rawQueryString to get the token before decoding it.
       */
      let token: string | undefined;
      let result: string | undefined;
      const queryParams = event.rawQueryString.split('&').forEach(param => {
        const [key, value] = param.split('=');
        if (key === 'token') {
            token = value;
        } else if (key === 'result') {
            result = value;
        }
      });
      if (!token || (result !== 'approve' && result !== 'reject')) {
          statusCode = 400;
          message = 'Missing or invalid token/result parameter. Result must be "approve" or "reject".';
      } else {
          // Call OrderService method
          await orderService.processApprovalCallback(token, result);
          message = `Request received for ${result}. Task token processed successfully.`;
          console.log(`Successfully processed callback for token '...' with result '${result}'.`);
      }
  } catch (error) {
      console.error("Error processing approval callback:", error);
      statusCode = 500;
      // Check if it's an SFN error or other service error
      message = `Internal Server Error processing the request: ${(error as Error).message}`;
      // Do not expose sensitive error details to the client calling the URL
  }

  // Return a user-friendly response
  // In a real application, you might return an HTML page confirming the action.
  return {
    statusCode: statusCode,
    body: JSON.stringify({ message: message }), // Simple JSON response
    // Consider adding HTML response for better UX
    headers: { 'Content-Type': 'application/json' } 
  };
};

handleApproval.path = __filename;
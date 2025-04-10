import { AppSyncEvent } from '../types/appsync';
import { Order, ShippingAddress } from '../entities/order.entity';
import { OrderService } from '../services/order.service';
import { Logger } from '@aws-lambda-powertools/logger';
import type { Context } from 'aws-lambda';
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn"; // <-- Import SFN client and command


const orderService = new OrderService();
const logger = new Logger({ serviceName: 'createOrderLambda' });

// Matches schema input type
interface OrderDetailInput {
    productId: string;
    quantity: number;
}

// Define ShippingAddress input mirroring the schema
interface ShippingAddressInput {
  street: string;
  city: string;
  postalCode: string;
  country: string;
  county?: string; // Added optional county field
}

interface CreateOrderArgs {
  input: {
    details: OrderDetailInput[];
    shippingAddress: ShippingAddressInput;
  };
}

// Define a minimal interface for the expected Cognito Identity structure
interface CognitoIdentity { 
  sub: string;
  issuer: string;
  username: string;
  claims: Record<string, any> & { email?: string }; // Ensure claims object exists and has optional email
  sourceIp: string[];
  defaultAuthStrategy: string;
  groups: string[] | null;
}

export const createOrder = async (
  event: AppSyncEvent<CreateOrderArgs>,
  context: Context
): Promise<Order> => {
  logger.addContext(context);
  logger.info('Received request for createOrder', { args: event.arguments });
  const sfnClient = new SFNClient({}); // <-- Initialize SFN Client
  const stateMachineArn = process.env.STATE_MACHINE_ARN;

  // --- Check if State Machine ARN is configured ---
  if (!stateMachineArn) {
    logger.error("STATE_MACHINE_ARN environment variable is not set. Cannot start post-order workflow.");
    // Depending on requirements, you might throw or just log this warning.
    // For now, we'll log and continue, as the order creation is primary.
  }

  // --- Extract User Email from Cognito Identity ---
  let userEmail: string | undefined;
  if (event.identity && typeof event.identity === 'object' && event.identity !== null && 'claims' in event.identity) {
    // Use the locally defined interface for type safety
    const cognitoIdentity = event.identity as CognitoIdentity; 
    if (cognitoIdentity.claims && cognitoIdentity.claims['email']) { // Check claims and email exist
      userEmail = cognitoIdentity.claims['email'];
      logger.info('Extracted user email from Cognito identity', { userEmail });
    } else {
      logger.warn('Cognito identity found, but email claim is missing');
      // Decide if this is an error condition for your use case
      // throw new Error('User email could not be determined from token.'); 
    }
  } else {
    logger.error('Could not find Cognito identity information in the event. Ensure API authorization is set to Cognito User Pools.');
    // This should ideally not happen if the AppSync API is configured correctly
    throw new Error('User identity not found.');
  }

  // Optional: Strict check - throw error if email couldn't be found
  if (!userEmail) {
     throw new Error('User email could not be determined from token.');
  }
  // -------------------------------------------------

  try {
    // Add the extracted email to the input passed to the service
    const serviceInput = {
      ...event.arguments.input,
      userEmail: userEmail // Add the email here
    };

    // Pass the modified input object (including email) to the service
    const result = await orderService.createOrder(serviceInput);
    logger.info('Successfully created order', { orderId: result.id });

    if (stateMachineArn) {
      const sfnInput = {
          // Pass only the necessary data for the *first* step of the SFN
          orderId: result.id,
          // You could add customerId if needed downstream:
          // customerId: createdOrder.customerId
      };

      const startExecutionParams = {
          stateMachineArn: stateMachineArn,
          input: JSON.stringify(sfnInput),
          // Optional: Provide a unique name, helps traceability, must be unique within 90 days
          name: `Order_${result.id}_${context.awsRequestId}`,
      };

      try {
          logger.info("Starting Step Functions execution", { stateMachineArn, input: sfnInput });
          await sfnClient.send(new StartExecutionCommand(startExecutionParams));
          logger.info("Successfully started Step Functions execution", { orderId: result.id });
      } catch (sfnError) {
          // Log the SFN start error but DO NOT fail the entire Lambda.
          // The order *was* created successfully. Failing SFN start is a secondary issue.
          logger.error("Failed to start Step Functions execution", {
              error: sfnError as Error,
              orderId: result.id,
              stateMachineArn: stateMachineArn
          });
          // Consider sending this error to a Dead Letter Queue or raising an alert.
      }
    }
    return result;
  } catch (error: any) {
    logger.error('Error processing createOrder request', { 
        errorName: error.name, 
        errorMessage: error.message, 
        errorStack: error.stack, 
        eventArguments: event.arguments 
    });
    throw error;
  }
};

createOrder.path = __filename; 
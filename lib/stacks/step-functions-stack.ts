import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as logs from 'aws-cdk-lib/aws-logs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Duration } from 'aws-cdk-lib';
import { sendOrderConfirmation } from '../lambdas/send-order-confirmation';
import { sendShipmentConfirmation } from '../lambdas/send-shipment-confirmation';
import { sendFeedbackRequest } from '../lambdas/send-feedback-request';
import { LambdaHandlerFunction } from '../types/lambda';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';


// Define properties required by this stack
export interface StepFunctionsStackProps extends cdk.StackProps {
    table: dynamodb.Table;
    senderEmailAddress: string;
}

type StepFunctionLambdas = {
    sendOrderConfirmation: NodejsFunction;
    sendShipmentConfirmation: NodejsFunction;
    sendFeedbackRequest: NodejsFunction;
};

export class StepFunctionsStack extends cdk.Stack {
    public readonly orderProcessingStateMachine: sfn.StateMachine;
    public readonly createdFunctions = {} as Record<keyof StepFunctionLambdas, NodejsFunction>;

    constructor(scope: Construct, id: string, props: StepFunctionsStackProps) {
        super(scope, id, props);

        // Array containing the imported handler function objects
        const lambdaHandlers: LambdaHandlerFunction[] = [
            sendOrderConfirmation,
            sendShipmentConfirmation,
            sendFeedbackRequest
            // Add other imported handlers here
        ];
  
      const SesEmailPermissionRequired = [
          sendOrderConfirmation.name,
          sendShipmentConfirmation.name,
          sendFeedbackRequest.name
      ];
  
      lambdaHandlers.forEach(handlerFunc => {
        if (!handlerFunc.path || !handlerFunc.name) {
          console.error(`Handler function ${handlerFunc} is missing 'path' or 'name' property.`);
          return; // Skip this handler
        }
  
        // Construct ID based on the handler name
        const functionId = `${handlerFunc.name}Lambda`;
  
        const lambdaFunction = new NodejsFunction(this, functionId, {
          entry: handlerFunc.path, // Use the path property
          handler: handlerFunc.name, // Use the name property
          runtime: Runtime.NODEJS_22_X, // Update if needed
          memorySize: 1024,
          timeout: cdk.Duration.seconds(5),
          bundling: {
            minify: true,
            sourceMap: true,
            target: 'es2022',
            externalModules: ['@aws-sdk/*'],
          },
          // role: startStepFunctionPermissionRequired.includes(handlerFunc.name) ? props.startStepFunctionExecutionRole : undefined,
          logRetention: logs.RetentionDays.ONE_WEEK,
          environment: {
            TABLE_NAME: props.table.tableName,
            SENDER_EMAIL_ADDRESS: props.senderEmailAddress,
          },
        });
  
  
  
        // Grant permissions (simplified - grant read/write + query)
        props.table.grantReadWriteData(lambdaFunction);
        props.table.grant(lambdaFunction, 'dynamodb:Query');
  
        // SES permissions for functions that send email
        if (SesEmailPermissionRequired.includes(handlerFunc.name)) {
          lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
            actions: ['ses:SendEmail', 'ses:SendRawEmail'],
            resources: ['*'], // Restrict if possible
            effect: iam.Effect.ALLOW,
          }));
        }

  
        // Add CloudFormation outputs
        new cdk.CfnOutput(this, `${handlerFunc.name}LogCommand`, {
          value: `aws logs tail /aws/lambda/${lambdaFunction.functionName} --follow`,
          description: `Command to view logs for the ${handlerFunc.name} Lambda function`,
          exportName: `${handlerFunc.name}LogCommand`,
        });
  
        new cdk.CfnOutput(this, `${handlerFunc.name}InvokeCommand`, {
          value: `aws lambda invoke --function-name ${lambdaFunction.functionName} --payload '${handlerFunc.name === 'sendOrderConfirmation' ? '{"orderId": "YOUR_ORDER_ID"}' : ''}' response.json`,
          description: `Command to invoke the ${handlerFunc.name} Lambda function`,
          exportName: `${handlerFunc.name}InvokeCommand`,
        });
  
        this.createdFunctions[handlerFunc.name as keyof StepFunctionLambdas] = lambdaFunction; // Use handler name as the key
      });

        // Define tasks for each Lambda function
        // Assuming the input to the state machine is { "orderId": "some-id" }

        const sendOrderConfirmationTask = new tasks.LambdaInvoke(this, 'SendOrderConfirmationTask', {
            lambdaFunction: this.createdFunctions.sendOrderConfirmation,
            // Pass the orderId from the state machine input
            payload: sfn.TaskInput.fromJsonPathAt('$'),
            resultPath: sfn.JsonPath.DISCARD, // Discard results if not needed
            retryOnServiceExceptions: true, // Default retry for Lambda service errors
        });

        const sendShipmentConfirmationTask = new tasks.LambdaInvoke(this, 'SendShipmentConfirmationTask', {
            lambdaFunction: this.createdFunctions.sendShipmentConfirmation,
            payload: sfn.TaskInput.fromJsonPathAt('$'),
            resultPath: sfn.JsonPath.DISCARD,
            retryOnServiceExceptions: true,
        });

        const waitOneDay = new sfn.Wait(this, 'WaitForFeedbackDelay', {
            time: sfn.WaitTime.duration(Duration.minutes(1)),
        });

        const sendFeedbackRequestTask = new tasks.LambdaInvoke(this, 'SendFeedbackRequestTask', {
            lambdaFunction: this.createdFunctions.sendFeedbackRequest,
            payload: sfn.TaskInput.fromJsonPathAt('$'),
            resultPath: sfn.JsonPath.DISCARD,
            retryOnServiceExceptions: true,
        });

        // Define the state machine flow
        const definition = sfn.Chain
            .start(sendOrderConfirmationTask)
            .next(sendShipmentConfirmationTask) // Immediately sends shipment confirmation as requested
            .next(waitOneDay)
            .next(sendFeedbackRequestTask);

        // Create the state machine
        this.orderProcessingStateMachine = new sfn.StateMachine(this, 'OrderProcessingStateMachine', {
            definitionBody: sfn.DefinitionBody.fromChainable(definition),
            stateMachineName: 'PostOrderEmailFlow', // Descriptive name
            timeout: Duration.days(2), // Timeout longer than the wait state
            comment: 'Handles post-order email sequence: order confirmation, shipment confirmation, feedback request after delay.',
            logs: { // Enable CloudWatch logging
                destination: new logs.LogGroup(this, 'PostOrderEmailFlowLogs'),
                level: sfn.LogLevel.ALL, // Adjust as needed (ERROR, FATAL, OFF)
                includeExecutionData: true,
            },
            tracingEnabled: true, // Enable X-Ray tracing
        });

        // Output the State Machine ARN
        new cdk.CfnOutput(this, 'OrderProcessingStateMachineArnOutput', {
            value: this.orderProcessingStateMachine.stateMachineArn,
            description: 'ARN of the Post-Order Email Flow State Machine',
            exportName: 'PostOrderEmailStateMachineArn', // Export name for cross-stack reference
        });
    }
} 
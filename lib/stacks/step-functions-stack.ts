import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as logs from 'aws-cdk-lib/aws-logs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Runtime, FunctionUrlAuthType } from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { LambdaHandlerFunction } from '../types/lambda';

// Import the handler functions themselves (now including all SFN lambdas)
import { sendOrderConfirmation } from '../lambdas/send-order-confirmation';
import { sendShipmentConfirmation } from '../lambdas/send-shipment-confirmation';
import { sendFeedbackRequest } from '../lambdas/send-feedback-request';
import { handleApproval } from '../lambdas/handle-approval';
import { handleRejection } from '../lambdas/handle-rejection';

// Define properties required by this stack
export interface StepFunctionsStackProps extends cdk.StackProps {
    table: dynamodb.Table;
    senderEmailAddress: string;
    approvalEmailAddress: string;
}

// Update type to include all lambdas defined in this stack
type StepFunctionLambdas = {
    sendOrderConfirmation: NodejsFunction;
    sendShipmentConfirmation: NodejsFunction;
    sendFeedbackRequest: NodejsFunction;
    handleApproval: NodejsFunction;
    handleRejection: NodejsFunction;
};

export class StepFunctionsStack extends cdk.Stack {
    public readonly orderProcessingStateMachine: sfn.StateMachine;
    public readonly createdFunctions = {} as Record<keyof StepFunctionLambdas, NodejsFunction>;
    public readonly approvalTopic: sns.Topic;
    public approvalLambdaFunctionUrl: string;

    constructor(scope: Construct, id: string, props: StepFunctionsStackProps) {
        super(scope, id, props);

        // --- SNS Topic for Approval ---
        this.approvalTopic = new sns.Topic(this, 'ShipmentApprovalTopic', {
            displayName: 'Order Shipment Approval Topic',
        });

        // Subscribe the provided email address
        this.approvalTopic.addSubscription(
            new subscriptions.EmailSubscription(props.approvalEmailAddress)
        );
        // Output the topic ARN
        new cdk.CfnOutput(this, 'ApprovalTopicArn', {
            value: this.approvalTopic.topicArn,
            description: 'ARN of the SNS topic for shipment approvals',
        });

        // Array containing the imported handler function objects
        const lambdaHandlers: LambdaHandlerFunction[] = [
            sendOrderConfirmation,
            sendShipmentConfirmation,
            sendFeedbackRequest,
            handleApproval,
            handleRejection,
        ];

        const SesEmailPermissionRequired = [
            sendOrderConfirmation.name,
            sendShipmentConfirmation.name,
            sendFeedbackRequest.name,
            handleRejection.name,
        ];

        const StepFunctionTaskPermissionsRequired = [
            handleApproval.name,
        ];

        const DDBWritePermissionsRequired = [
            sendOrderConfirmation.name,
            sendShipmentConfirmation.name,
            sendFeedbackRequest.name,
            handleRejection.name,
        ];
         const DDBReadPermissionsRequired = [
             sendOrderConfirmation.name,
             sendShipmentConfirmation.name,
             sendFeedbackRequest.name,
             handleRejection.name,
         ];

        lambdaHandlers.forEach(handlerFunc => {
            if (!handlerFunc.path || !handlerFunc.name) {
                console.error(`Handler function ${handlerFunc} is missing 'path' or 'name' property.`);
                return;
            }

            // Construct ID based on the handler name
            const functionId = `${handlerFunc.name}Lambda`;

            const lambdaFunction = new NodejsFunction(this, functionId, {
                entry: handlerFunc.path,
                handler: handlerFunc.name,
                runtime: Runtime.NODEJS_22_X,
                memorySize: 1024,
                timeout: cdk.Duration.seconds(10),
                bundling: {
                    minify: true,
                    sourceMap: true,
                    target: 'es2022',
                    externalModules: ['@aws-sdk/*'],
                },
                logRetention: logs.RetentionDays.ONE_WEEK,
                environment: {
                    TABLE_NAME: props.table.tableName,
                    SENDER_EMAIL_ADDRESS: props.senderEmailAddress,
                },
            });

            // Grant DDB Read Permissions
            if (DDBReadPermissionsRequired.includes(handlerFunc.name)) {
                 props.table.grantReadData(lambdaFunction);
                 props.table.grant(lambdaFunction, 'dynamodb:Query');
            }

            // Grant DDB Write Permissions (includes delete)
            if (DDBWritePermissionsRequired.includes(handlerFunc.name)) {
                 props.table.grantWriteData(lambdaFunction);
            }

            // SES permissions for functions that send email
            if (SesEmailPermissionRequired.includes(handlerFunc.name)) {
                lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
                    actions: ['ses:SendEmail', 'ses:SendRawEmail'],
                    resources: ['*'],
                    effect: iam.Effect.ALLOW,
                }));
                lambdaFunction.addEnvironment('SENDER_EMAIL_ADDRESS', props.senderEmailAddress);
            }

            // Step Functions Task permissions (SendTaskSuccess/Failure)
            if (StepFunctionTaskPermissionsRequired.includes(handlerFunc.name)) {
                lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
                    actions: ['states:SendTaskSuccess', 'states:SendTaskFailure'],
                    resources: ['*'],
                    effect: iam.Effect.ALLOW,
                }));
            }

            // --- Function URL for handleApproval ---
            if (handlerFunc.name === handleApproval.name) {
                const functionUrl = lambdaFunction.addFunctionUrl({
                    authType: FunctionUrlAuthType.NONE,
                });
                // Store the URL string in the variable
                this.approvalLambdaFunctionUrl = functionUrl.url;

                // Output the Function URL
                new cdk.CfnOutput(this, 'ApprovalLambdaUrlOutput', {
                    value: functionUrl.url,
                    description: 'URL for the Approval Lambda function',
                });
            }

            // Add CloudFormation outputs for logging/invocation
            new cdk.CfnOutput(this, `${handlerFunc.name}LogCommand`, {
                value: `aws logs tail /aws/lambda/${lambdaFunction.functionName} --follow`,
                description: `Command to view logs for the ${handlerFunc.name} Lambda function`,
                exportName: `${handlerFunc.name}LogCommand`,
            });

            // Basic invoke command output (adjust payload as needed)
            new cdk.CfnOutput(this, `${handlerFunc.name}InvokeCommand`, {
                 value: `aws lambda invoke --function-name ${lambdaFunction.functionName} --payload '{}' response.json`,
                 description: `Command to invoke the ${handlerFunc.name} Lambda function`,
                 exportName: `${handlerFunc.name}InvokeCommand`,
             });

            this.createdFunctions[handlerFunc.name as keyof StepFunctionLambdas] = lambdaFunction;
        });

        // Ensure the URL was captured before proceeding
        if (!this.approvalLambdaFunctionUrl) {
            throw new Error("Approval Lambda Function URL could not be determined. Check the handler name and loop logic.");
        }

        // --- State Machine Definition ---

        // Define tasks using the functions created in this stack
        const sendOrderConfirmationTask = new tasks.LambdaInvoke(this, 'SendOrderConfirmationTask', {
            lambdaFunction: this.createdFunctions.sendOrderConfirmation,
            payload: sfn.TaskInput.fromJsonPathAt('$'),
            resultPath: sfn.JsonPath.DISCARD,
        });

        // Task to request approval via SNS
        const requestApprovalTask = new tasks.SnsPublish(this, 'RequestShipmentApproval', {
            topic: this.approvalTopic,
            message: sfn.TaskInput.fromObject({
                'OrderId.$': '$.orderId',
                'Message': sfn.JsonPath.format(
                    'Please approve or reject shipment for order {}. Approval Link: {}/?token={}&result=approve Rejection Link: {}/?token={}&result=reject',
                    sfn.JsonPath.stringAt('$.orderId'),
                    this.approvalLambdaFunctionUrl,
                    sfn.JsonPath.taskToken,
                    this.approvalLambdaFunctionUrl,
                    sfn.JsonPath.taskToken
                ),
            }),
            subject: sfn.JsonPath.format('Action Required: Approve Shipment for Order {}', sfn.JsonPath.stringAt('$.orderId')),
            integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
            timeout: Duration.days(1),
            resultPath: sfn.JsonPath.DISCARD,
        });

        const sendShipmentConfirmationTask = new tasks.LambdaInvoke(this, 'SendShipmentConfirmationTask', {
            lambdaFunction: this.createdFunctions.sendShipmentConfirmation,
            payload: sfn.TaskInput.fromJsonPathAt('$'),
            resultPath: sfn.JsonPath.DISCARD,
        });

        const waitOneDay = new sfn.Wait(this, 'WaitForFeedbackDelay', {
            time: sfn.WaitTime.duration(Duration.minutes(1)),
        });

        const sendFeedbackRequestTask = new tasks.LambdaInvoke(this, 'SendFeedbackRequestTask', {
            lambdaFunction: this.createdFunctions.sendFeedbackRequest,
            payload: sfn.TaskInput.fromJsonPathAt('$'),
            resultPath: sfn.JsonPath.DISCARD,
        });

        // --- Rejection Flow ---
        const handleRejectionTask = new tasks.LambdaInvoke(this, 'HandleRejectionTask', {
            lambdaFunction: this.createdFunctions.handleRejection,
            payload: sfn.TaskInput.fromJsonPathAt('$'),
            resultPath: sfn.JsonPath.DISCARD,
        });

        const rejectionFailedState = new sfn.Fail(this, 'ShipmentRejectedOrTimedOut', {
             comment: 'Shipment was rejected by the owner or the approval timed out.',
             causePath: sfn.JsonPath.stringAt('$.ErrorDetails.Cause'),
             errorPath: sfn.JsonPath.stringAt('$.ErrorDetails.Error'),
         });

        const rejectionFlow = handleRejectionTask.next(rejectionFailedState);

        // --- Define the State Machine Flow ---
        const definition = sfn.Chain
            .start(sendOrderConfirmationTask)
            .next(requestApprovalTask)
            .next(sendShipmentConfirmationTask)
            .next(waitOneDay)
            .next(sendFeedbackRequestTask);

        // Add error handling to the approval task
        requestApprovalTask.addCatch(rejectionFlow, {
            errors: ['States.Timeout'],
            resultPath: '$.ErrorDetails',
        });
         requestApprovalTask.addCatch(rejectionFlow, {
             errors: ['ApprovalRejectedError'],
             resultPath: '$.ErrorDetails',
         });

        // Create the state machine
        this.orderProcessingStateMachine = new sfn.StateMachine(this, 'OrderProcessingStateMachine', {
            definitionBody: sfn.DefinitionBody.fromChainable(definition),
            stateMachineName: 'OrderProcessingWithApproval',
            timeout: Duration.days(3),
            comment: 'Handles post-order emails including manual shipment approval.',
            logs: {
                destination: new logs.LogGroup(this, 'OrderProcessingWithApprovalLogs', {
                    removalPolicy: RemovalPolicy.DESTROY
                }),
                level: sfn.LogLevel.ALL,
                includeExecutionData: true,
            },
            tracingEnabled: true,
        });

        // --- Grant State Machine Permissions ---
        this.approvalTopic.grantPublish(this.orderProcessingStateMachine);

        // Output the State Machine ARN
        new cdk.CfnOutput(this, 'OrderProcessingStateMachineArnOutput', {
            value: this.orderProcessingStateMachine.stateMachineArn,
            description: 'ARN of the Order Processing State Machine with Approval',
            exportName: 'OrderProcessingWithApprovalStateMachineArn',
        });
    }
} 
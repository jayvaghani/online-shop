import { StackProps, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { LambdaStack } from './stacks/lambda-stack';
import { AppSyncStack } from './stacks/appsync-stack';
import { DynamoDBStack } from './stacks/dynamodb-stack';
import { CognitoStack } from './stacks/cognito-stack';
import { StepFunctionsStack } from './stacks/step-functions-stack';
import { DataExportStack } from './stacks/data-export-stack';

export interface AppProps extends StackProps {
  owner: string;
  senderEmailAddress: string;
  approvalEmailAddress: string;
  dataExportNotificationEmail?: string;
}

export class OnlineShopStack extends Stack {
  
  public readonly dynamoDBStack: DynamoDBStack;
  public readonly cognitoStack: CognitoStack;
  public readonly lambdaStack: LambdaStack;
  public readonly appsyncStack: AppSyncStack;
  public readonly stepFunctionsStack: StepFunctionsStack;
  public readonly dataExportStack: DataExportStack;

  constructor(scope: Construct, id: string, props: AppProps) {
    super(scope, id, props);

    this.tags.setTag("Owner", props.owner);

    // Initialize the DynamoDB stack
    this.dynamoDBStack = new DynamoDBStack(this, 'DynamoDBStack', {
      env: props?.env,
    });

    // Initialize the Data Export stack
    this.dataExportStack = new DataExportStack(this, 'DataExportStack', {
      env: props?.env,
      table: this.dynamoDBStack.table,
      notificationEmail: props.dataExportNotificationEmail,
    });

    // Initialize the Cognito stack
    this.cognitoStack = new CognitoStack(this, 'CognitoStack', {
        env: props?.env,
    });

    // Initialize the Step Functions stack
    this.stepFunctionsStack = new StepFunctionsStack(this, 'StepFunctionsStack', {
        env: props?.env,
        table: this.dynamoDBStack.table,
        senderEmailAddress: props.senderEmailAddress,
        approvalEmailAddress: props.approvalEmailAddress,
    });

    // Initialize the Lambda stack, passing the DynamoDB table
    this.lambdaStack = new LambdaStack(this, 'LambdaStack', {
      env: props?.env,
      table: this.dynamoDBStack.table,
      stepFunctionStateMachineArn: this.stepFunctionsStack.orderProcessingStateMachine.stateMachineArn,
    });

    // Initialize the AppSync stack, passing Cognito User Pool
    this.appsyncStack = new AppSyncStack(this, 'AppSyncStack', {
      env: props?.env,
      lambdaFunctions: this.lambdaStack.lambdaFunctions,
      userPool: this.cognitoStack.userPool,
    });


    this.lambdaStack.addDependency(this.dynamoDBStack);
    this.lambdaStack.addDependency(this.stepFunctionsStack);
    this.appsyncStack.addDependency(this.lambdaStack);
    this.appsyncStack.addDependency(this.cognitoStack);

    // Add dependency for DataExportStack if needed (e.g., if it depends on DynamoDB)
    this.dataExportStack.addDependency(this.dynamoDBStack);

  }
}


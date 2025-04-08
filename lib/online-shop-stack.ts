import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { LambdaStack } from './stacks/lambda-stack';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class OnlineShopStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Initialize the Lambda stack
    new LambdaStack(this, 'OnlineShopLambdaStack', {
      env: props?.env,
    });

    // The code that defines your stack goes here
    
    // example resource
    // const queue = new sqs.Queue(this, 'OnlineShopQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}

import { StackProps, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { LambdaStack } from './stacks/lambda-stack';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export interface AppProps extends StackProps {
  owner: string;
}

export class OnlineShopStack extends Stack {
  constructor(scope: Construct, id: string, props: AppProps) {
    super(scope, id, props);

    this.tags.setTag("Owner", props.owner);

    // Initialize the Lambda stack
    new LambdaStack(this, 'LambdaStack', {
      env: props?.env,
    });

    // The code that defines your stack goes here
    
    // example resource
    // const queue = new sqs.Queue(this, 'OnlineShopQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}

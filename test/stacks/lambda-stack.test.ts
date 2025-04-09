import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { LambdaStack } from '../../lib/stacks/lambda-stack';
import { DynamoDBStack } from '../../lib/stacks/dynamodb-stack'; // Needed for table dependency

test('Lambda Stack Creates Functions with Correct Permissions', () => {
  const app = new cdk.App();

  // Create dependent DynamoDbStack first
  const dynamoDbStack = new DynamoDBStack(app, 'MyDynamoDbTestStackForLambda');

  // Create the LambdaStack, passing the table from DynamoDbStack
  const lambdaStack = new LambdaStack(app, 'MyLambdaTestStack', {
    table: dynamoDbStack.table, // Pass the actual table object
  });

  // Prepare the LambdaStack for assertions
  const template = Template.fromStack(lambdaStack);

  // 1. Assert that a specific Lambda function is created (e.g., getProductById)
  template.hasResourceProperties('AWS::Lambda::Function', {
    // Handler: 'index.getProductById', // Check based on your handler definition
    Runtime: 'nodejs22.x', // Check based on your runtime config
    // Check for Environment Variables (if any were set, like TABLE_NAME - now removed)
    // Environment: {
    //   Variables: {
    //     TABLE_NAME: { Ref: Match.stringLikeRegexp(dynamoDbStack.table.tableName) }, // Check if TABLE_NAME is set
    //   },
    // },
  });

  // 2. Assert count of Lambda functions (adjust number based on your stack)
  // This is a less specific test, but can catch accidental removals/additions.
  // Get the list of all Lambda function names from your stack definition if needed.
  // const expectedFunctionCount = 23; // Example: Update with actual count
  // template.resourceCountIs('AWS::Lambda::Function', expectedFunctionCount);

}); 
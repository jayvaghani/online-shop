import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { DynamoDBStack } from '../../lib/stacks/dynamodb-stack';

test('DynamoDB Stack Creates Table with Correct Properties', () => {
  const app = new cdk.App();
  // Create the DynamoDbStack
  const stack = new DynamoDBStack(app, 'MyDynamoDbTestStack');
  // Prepare the stack for assertions
  const template = Template.fromStack(stack);

  // Assert that only one DynamoDB table is created
  template.resourceCountIs('AWS::DynamoDB::Table', 1);

  // Assert that the table has the expected properties
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'GSI1PK', AttributeType: 'S' },
      { AttributeName: 'GSI1SK', AttributeType: 'S' },
      { AttributeName: 'GSI2PK', AttributeType: 'S' },
      { AttributeName: 'GSI2SK', AttributeType: 'S' },
    ],
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' },
    ],
    GlobalSecondaryIndexes: [
      { IndexName: 'GSI1', KeySchema: [{ AttributeName: 'GSI1PK', KeyType: 'HASH' }, { AttributeName: 'GSI1SK', KeyType: 'RANGE' }], Projection: { ProjectionType: 'ALL' } },
      { IndexName: 'GSI2', KeySchema: [{ AttributeName: 'GSI2PK', KeyType: 'HASH' }, { AttributeName: 'GSI2SK', KeyType: 'RANGE' }], Projection: { ProjectionType: 'ALL' } },
    ],
    // Check for removal policy (important for production)
    // Note: The exact value depends on your stack configuration (e.g., cdk.RemovalPolicy.RETAIN or DESTROY)
    // Update 'Retain' if your default policy is different
    // RemovalPolicy: 'Retain' // This might be commented out if using default or depending on context
    PointInTimeRecoverySpecification: {
      PointInTimeRecoveryEnabled: true,
    },
  });
}); 
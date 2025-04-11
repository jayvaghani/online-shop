"use strict";
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as OnlineShop from '../../lib/online-shop-stack';

// example test. To run these tests, uncomment this file along with the
// example resource in lib/online-shop-stack.ts
test('SQS Queue Created', () => {
//   const app = new cdk.App();
//     // WHEN
//   const stack = new OnlineShop.OnlineShopStack(app, 'MyTestStack');
//     // THEN
//   const template = Template.fromStack(stack);

//   template.hasResourceProperties('AWS::SQS::Queue', {
//     VisibilityTimeout: 300
//   });
});

test('DynamoDB Table Created', () => {
  const app = new cdk.App();
    // WHEN
  const stack = new OnlineShop.OnlineShopStack(app, 'MyTestStack',{
    owner: 'test',
    senderEmailAddress: 'test@trilogy.com',
    approvalEmailAddress: 'test@trilogy.com'
  });
    // THEN
  const template = Template.fromStack(stack.dynamoDBStack);

  template.resourceCountIs('AWS::DynamoDB::Table', 1); // Check if one DynamoDB table is created
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    // Add specific properties to check if needed, e.g., BillingMode
    BillingMode: 'PAY_PER_REQUEST'
  });
});

// Add more tests for the OnlineShopStack here if needed
// For example, checking if sub-stacks are instantiated (though this is harder with fine-grained assertions)
// It might be better to test sub-stack resources within their own test suites.

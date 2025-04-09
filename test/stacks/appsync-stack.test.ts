import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { AppSyncStack } from '../../lib/stacks/appsync-stack';
import { LambdaStack } from '../../lib/stacks/lambda-stack'; // Dependency
import { DynamoDBStack } from '../../lib/stacks/dynamodb-stack'; // Dependency for LambdaStack
import { CognitoStack } from '../../lib/stacks/cognito-stack'; // Dependency

test('AppSync Stack Creates API, Schema, Resolvers, Data Sources', () => {
  const app = new cdk.App();

  // Create dependent stacks
  const dynamoDbStack = new DynamoDBStack(app, 'MyDynamoDbTestStackForAppSync');
  const cognitoStack = new CognitoStack(app, 'MyCognitoTestStackForAppSync');
  const lambdaStack = new LambdaStack(app, 'MyLambdaTestStackForAppSync', {
    table: dynamoDbStack.table,
  });

  // Create the AppSyncStack
  const appSyncStack = new AppSyncStack(app, 'MyAppSyncTestStack', {
    userPool: cognitoStack.userPool,
    lambdaFunctions: lambdaStack.lambdaFunctions, // Pass the map of functions
  });

  // Prepare the AppSyncStack for assertions
  const template = Template.fromStack(appSyncStack);

  // 1. Assert GraphQL API is created
  template.resourceCountIs('AWS::AppSync::GraphQLApi', 1);
  template.hasResourceProperties('AWS::AppSync::GraphQLApi', {
    Name: 'online-shop-api',
    AuthenticationType: 'AMAZON_COGNITO_USER_POOLS', // Or API_KEY, IAM depending on config
    UserPoolConfig: {
        AwsRegion: { Ref: 'AWS::Region' },
        DefaultAction: 'ALLOW'
    },
    // Add checks for additionalAuthenticationProviders, XrayEnabled, etc. if configured
    XrayEnabled: true
  });

  // 2. Assert GraphQL Schema is created
  template.resourceCountIs('AWS::AppSync::GraphQLSchema', 1);

  // 3. Assert Data Sources are created (check count and properties for one example)
  // Adjust the count based on how many Lambda data sources you create
  // const expectedDataSourceCount = lambdaStack.lambdaFunctions.size; // Example
  // template.resourceCountIs('AWS::AppSync::DataSource', expectedDataSourceCount);
  template.hasResourceProperties('AWS::AppSync::DataSource', {
    Name: Match.stringLikeRegexp('.*getProductById.*'), // Example: Adjust to match your data source naming
    Type: 'AWS_LAMBDA',
    // LambdaConfig: {
    //   LambdaFunctionArn: { 'Fn::GetAtt': [Match.stringLikeRegexp('.*getProductById.*'), 'Arn'] }
    // }
    // Check ServiceRoleArn if applicable
  });

  // 4. Assert Resolvers are created (check count and properties for one example)
  // Adjust the count based on the number of resolvers
  // const expectedResolverCount = 25; // Example
  // template.resourceCountIs('AWS::AppSync::Resolver', expectedResolverCount);
  template.hasResourceProperties('AWS::AppSync::Resolver', {
    FieldName: 'getProduct', // Example field name
    TypeName: 'Query', // Example type name (Query, Mutation, or specific Type like Order)
    DataSourceName: 'getProductByIdDataSource', // Check it references the correct data source
    // Check RequestMappingTemplate / ResponseMappingTemplate if not using direct Lambda invocation
  });

}); 
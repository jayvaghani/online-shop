import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CognitoStack } from '../../lib/stacks/cognito-stack';

test('Cognito Stack Creates User Pool and Client', () => {
  const app = new cdk.App();
  // Create the CognitoStack
  const stack = new CognitoStack(app, 'MyCognitoTestStack');
  // Prepare the stack for assertions
  const template = Template.fromStack(stack);

  // Assert User Pool is created
  template.resourceCountIs('AWS::Cognito::UserPool', 1);
  template.hasResourceProperties('AWS::Cognito::UserPool', {
    UserPoolName: 'online-shop-user-pool',
    Schema: [
      {
        Name: 'email',
        // AttributeDataType: 'String',
        Mutable: true,
        Required: true,
      },
      {
        Name: 'name',
        // AttributeDataType: 'String',
        Mutable: true,
        Required: true,
      },
      {
        Name: 'address',
        Mutable: true,
        Required: true,
      },
    ],
    Policies: {
      PasswordPolicy: {
        MinimumLength: 8,
        RequireLowercase: true,
        RequireNumbers: true,
        RequireSymbols: false, // Adjust if symbols are required
        RequireUppercase: true,
      },
    },
    AutoVerifiedAttributes: ['email'],
    // Add other properties like MFA, AccountRecoverySetting if configured
  });

  // Assert User Pool Client is created
  template.resourceCountIs('AWS::Cognito::UserPoolClient', 1);
  template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
    ClientName: 'app-client',
    // Check UserPoolId refers to the created User Pool
    // UserPoolId: { Ref: stack.resolve(stack.userPool.userPoolId) }, // Use resolve to get the tokenized value
    ExplicitAuthFlows: [
      'ALLOW_USER_SRP_AUTH',
      'ALLOW_REFRESH_TOKEN_AUTH',
    ],
    // Add other properties like CallbackURLs, LogoutURLs if configured
  });

  // Assert Identity Pool is created (if applicable)
  // template.resourceCountIs('AWS::Cognito::IdentityPool', 1);
  // template.hasResourceProperties('AWS::Cognito::IdentityPool', {
  //   AllowUnauthenticatedIdentities: false, // Or true depending on config
  //   CognitoIdentityProviders: [
  //     {
  //       ClientId: { Ref: stack.resolve(stack.userPoolClient.userPoolClientId) },
  //       ProviderName: { 'Fn::GetAtt': [stack.resolve(stack.userPool.logicalId), 'ProviderName'] }
  //     }
  //   ]
  // });

  // Assert Identity Pool Role Attachment (if applicable)
  // template.resourceCountIs('AWS::Cognito::IdentityPoolRoleAttachment', 1);
}); 
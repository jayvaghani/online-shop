import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { CognitoStack } from '../../lib/stacks/cognito-stack';

test('Cognito Stack Creates User Pool, Groups, and Web Client', () => {
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
    AccountRecoverySetting: {
      RecoveryMechanisms: Match.arrayWith([
        Match.objectLike({ Name: 'verified_email' }),
      ])
    }
  });

  // Assert User Pool Groups are created
  template.resourceCountIs('AWS::Cognito::UserPoolGroup', 2);

  // Assert Customers Group properties
  template.hasResourceProperties('AWS::Cognito::UserPoolGroup', {
    GroupName: 'Customers',
    UserPoolId: { Ref: Match.stringLikeRegexp('OnlineShopUserPool.*') },
    Description: 'Customers group',
  });

  // Assert Admins Group properties
  template.hasResourceProperties('AWS::Cognito::UserPoolGroup', {
    GroupName: 'Admins',
    UserPoolId: { Ref: Match.stringLikeRegexp('OnlineShopUserPool.*') },
    Description: 'Admins group',
  });

  // Assert User Pool Client is created for Web App
  template.resourceCountIs('AWS::Cognito::UserPoolClient', 1);
  template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
    ClientName: 'web-app-client',
    UserPoolId: { Ref: Match.stringLikeRegexp('OnlineShopUserPool.*') },
    GenerateSecret: false,
    ExplicitAuthFlows: Match.arrayWith([
      'ALLOW_USER_PASSWORD_AUTH',
      'ALLOW_USER_SRP_AUTH',
      'ALLOW_REFRESH_TOKEN_AUTH',
    ]),
    SupportedIdentityProviders: ['COGNITO'],
    CallbackURLs: Match.arrayWith([
      'https://your-app-domain/callback',
      'http://localhost:3000/callback'
    ]),
    LogoutURLs: Match.arrayWith([
      'https://your-app-domain/logout',
      'http://localhost:3000/logout'
    ]),
    AllowedOAuthFlows: Match.arrayWith([
      'implicit',
      'code'
    ]),
    AllowedOAuthScopes: Match.arrayWith([
      'email',
      'openid',
      'profile',
      'aws.cognito.signin.user.admin'
    ]),
    AllowedOAuthFlowsUserPoolClient: true,
    PreventUserExistenceErrors: 'ENABLED'
  });

  // Assert Outputs
  template.hasOutput('UserPoolId', {});
  template.hasOutput('UserPoolClientId', {});
  template.hasOutput('AdminGroupName', {});
  template.hasOutput('CustomerGroupName', {});

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
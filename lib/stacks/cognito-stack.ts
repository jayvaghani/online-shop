import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';

export class CognitoStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a Cognito User Pool
    this.userPool = new cognito.UserPool(this, 'OnlineShopUserPool', {
      userPoolName: 'online-shop-user-pool',
      selfSignUpEnabled: true, // Allow users to sign up
      signInAliases: {
        email: true, // Allow sign-in with email
      },
      autoVerify: {
        email: true, // Automatically send verification emails
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true, 
        },
        fullname: { // Add name attribute
            required: true,
            mutable: true,
        },
        address: { // Add address attribute
            required: true,
            mutable: true,
        }
        // Add other required attributes if needed
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false, // Be cautious with symbol requirements
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // DESTROY for easy cleanup in dev, RETAIN/SNAPSHOT in prod
    });

    // Create a User Pool Client for the AppSync API
    this.userPoolClient = new cognito.UserPoolClient(this, 'OnlineShopUserPoolClient', {
      userPool: this.userPool,
      generateSecret: false, // AppSync using USER_POOL auth doesn't need a client secret
      authFlows: {
        userSrp: true, // Recommended secure flow
        // adminUserPassword: true, // Enable if needed for admin actions
      },
      userPoolClientName: 'app-client',
    });

    // Outputs
    new cdk.CfnOutput(this, 'UserPoolId', { value: this.userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: this.userPoolClient.userPoolClientId });
  }
} 
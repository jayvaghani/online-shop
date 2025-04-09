import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';

export class CognitoStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly adminGroup: cognito.CfnUserPoolGroup;
  public readonly customerGroup: cognito.CfnUserPoolGroup;

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

    // Create User Pool Groups
    this.customerGroup = new cognito.CfnUserPoolGroup(this, 'CustomerGroup', {
      groupName: 'Customers',
      userPoolId: this.userPool.userPoolId,
      description: 'Customers group',
      // precedence: 10 // Optional: lower precedence gets higher priority
    });

    this.adminGroup = new cognito.CfnUserPoolGroup(this, 'AdminGroup', {
      groupName: 'Admins',
      userPoolId: this.userPool.userPoolId,
      description: 'Admins group',
      // precedence: 5 // Optional: lower precedence gets higher priority
    });

    // Create a User Pool Client for the Web App
    this.userPoolClient = new cognito.UserPoolClient(this, 'OnlineShopUserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: 'web-app-client', // Changed name for clarity
      generateSecret: false, // Typically false for public web clients (SPA)
      authFlows: {
        userSrp: true,
        // adminUserPassword: true, // Avoid if possible for security
        userPassword: true // Enable username/password flow if needed, but SRP is preferred
      },
      supportedIdentityProviders: [ // Allow users from this pool
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
      oAuth: {
        flows: {
          authorizationCodeGrant: true, // Standard flow for web apps
          implicitCodeGrant: true // Often used by SPAs, consider security implications
        },
        scopes: [ // Define scopes your application needs
            cognito.OAuthScope.EMAIL,
            cognito.OAuthScope.OPENID,
            cognito.OAuthScope.PROFILE,
            cognito.OAuthScope.COGNITO_ADMIN // If admin actions needed from client
        ],
        callbackUrls: [
          'https://your-app-domain/callback', // Placeholder - UPDATE THIS
          'http://localhost:3000/callback' // Placeholder for local dev - UPDATE THIS
        ],
        logoutUrls: [
           'https://your-app-domain/logout', // Placeholder - UPDATE THIS
           'http://localhost:3000/logout' // Placeholder for local dev - UPDATE THIS
        ],
      },
      // Prevent token revocation for refresh tokens, recommended for SPAs
      preventUserExistenceErrors: true, // Helps prevent user enumeration attacks
    });

    // Outputs
    new cdk.CfnOutput(this, 'UserPoolId', { value: this.userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: this.userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, 'AdminGroupName', { value: this.adminGroup.groupName || '' });
    new cdk.CfnOutput(this, 'CustomerGroupName', { value: this.customerGroup.groupName || '' });
  }
} 
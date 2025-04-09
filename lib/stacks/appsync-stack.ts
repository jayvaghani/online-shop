import * as cdk from 'aws-cdk-lib';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

export interface AppSyncStackProps extends cdk.StackProps {
  lambdaFunctions: {
    getAllCategories: NodejsFunction;
    getCategoryById: NodejsFunction;
    getProductsByCategory: NodejsFunction;
    getProductById: NodejsFunction;
    createProduct: NodejsFunction;
    updateProduct: NodejsFunction;
    deleteProduct: NodejsFunction;
    getAllProducts: NodejsFunction;
    createCategory: NodejsFunction;
    updateCategory: NodejsFunction;
    deleteCategory: NodejsFunction;
    getCustomer: NodejsFunction;
    listCustomers: NodejsFunction;
    getCustomerByEmail: NodejsFunction;
    createCustomer: NodejsFunction;
    updateCustomer: NodejsFunction;
    deleteCustomer: NodejsFunction;
    getOrder: NodejsFunction;
    listOrdersByCustomer: NodejsFunction;
    listAllOrders: NodejsFunction;
    createOrder: NodejsFunction;
    updateOrder: NodejsFunction;
    getOrderDetails: NodejsFunction;
  };
  userPool: cognito.IUserPool;
}

export class AppSyncStack extends cdk.Stack {
  public readonly api: appsync.GraphqlApi;

  constructor(scope: Construct, id: string, props: AppSyncStackProps) {
    super(scope, id, props);

    this.api = new appsync.GraphqlApi(this, 'OnlineShopApi', {
      name: 'online-shop-api',
      definition: {
        schema: appsync.SchemaFile.fromAsset(path.join(__dirname, '../schema/schema.graphql')),
      },
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool: props.userPool,
            defaultAction: appsync.UserPoolDefaultAction.ALLOW,
          }
        },
        additionalAuthorizationModes: [
          {
            authorizationType: appsync.AuthorizationType.API_KEY,
            apiKeyConfig: {
              name: 'OnlineShop Public API Key',
              description: 'API Key for public access operations',
              expires: cdk.Expiration.after(cdk.Duration.days(365))
            }
          }
        ]
      },
      xrayEnabled: true,
      logConfig: {
        fieldLogLevel: appsync.FieldLogLevel.ALL,
        retention: logs.RetentionDays.ONE_WEEK,
      }
    });

    const dataSources = {} as Record<keyof typeof props.lambdaFunctions, appsync.LambdaDataSource>;
    for (const [handlerName, lambdaFn] of Object.entries(props.lambdaFunctions)) {
        if (lambdaFn) {
            dataSources[handlerName as keyof typeof props.lambdaFunctions] = this.api.addLambdaDataSource(`${handlerName}DataSource`, lambdaFn);
        }
    }

    const resolverMappings = [
        { typeName: 'Query', fieldName: 'getProduct', dataSource: dataSources.getProductById },
        { typeName: 'Query', fieldName: 'listProducts', dataSource: dataSources.getAllProducts },
        { typeName: 'Query', fieldName: 'getProductsByCategory', dataSource: dataSources.getProductsByCategory },
        { typeName: 'Mutation', fieldName: 'createProduct', dataSource: dataSources.createProduct },
        { typeName: 'Mutation', fieldName: 'updateProduct', dataSource: dataSources.updateProduct },
        { typeName: 'Mutation', fieldName: 'deleteProduct', dataSource: dataSources.deleteProduct },
        { typeName: 'Query', fieldName: 'getCategory', dataSource: dataSources.getCategoryById },
        { typeName: 'Query', fieldName: 'listCategories', dataSource: dataSources.getAllCategories },
        { typeName: 'Mutation', fieldName: 'createCategory', dataSource: dataSources.createCategory },
        { typeName: 'Mutation', fieldName: 'updateCategory', dataSource: dataSources.updateCategory },
        { typeName: 'Mutation', fieldName: 'deleteCategory', dataSource: dataSources.deleteCategory },
        { typeName: 'Query', fieldName: 'getCustomer', dataSource: dataSources.getCustomer },
        { typeName: 'Query', fieldName: 'listCustomers', dataSource: dataSources.listCustomers },
        { typeName: 'Query', fieldName: 'getCustomerByEmail', dataSource: dataSources.getCustomerByEmail },
        { typeName: 'Mutation', fieldName: 'createCustomer', dataSource: dataSources.createCustomer },
        { typeName: 'Mutation', fieldName: 'updateCustomer', dataSource: dataSources.updateCustomer },
        { typeName: 'Mutation', fieldName: 'deleteCustomer', dataSource: dataSources.deleteCustomer },
        { typeName: 'Query', fieldName: 'getOrder', dataSource: dataSources.getOrder },
        { typeName: 'Query', fieldName: 'listOrdersByCustomer', dataSource: dataSources.listOrdersByCustomer },
        { typeName: 'Query', fieldName: 'listAllOrders', dataSource: dataSources.listAllOrders },
        { typeName: 'Mutation', fieldName: 'createOrder', dataSource: dataSources.createOrder },
        { typeName: 'Mutation', fieldName: 'updateOrder', dataSource: dataSources.updateOrder },
        { 
            typeName: 'Order', 
            fieldName: 'customer', 
            dataSource: dataSources.getCustomer,
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(JSON.stringify({
                "arguments": { "id": "$context.source.customerId" }
            }))
        },
        { 
            typeName: 'Order', 
            fieldName: 'details', 
            dataSource: dataSources.getOrderDetails
        },
        { 
            typeName: 'OrderDetail', 
            fieldName: 'product', 
            dataSource: dataSources.getProductById,
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(JSON.stringify({
                "arguments": { "id": "$context.source.productId" }
            }))
        },
        {
            typeName: 'Product',
            fieldName: 'category',
            dataSource: dataSources.getCategoryById,
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(JSON.stringify({
                "arguments": { "id": "$context.source.categoryId" }
            }))
        }
    ];

    resolverMappings.forEach(mapping => {
        if (mapping.dataSource) {
            mapping.dataSource.createResolver(`${mapping.typeName}${mapping.fieldName}Resolver`, {
                typeName: mapping.typeName,
                fieldName: mapping.fieldName,
                requestMappingTemplate: mapping.requestMappingTemplate,
                responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
            });
        } else {
          console.warn(`Missing data source for resolver: ${mapping.typeName}.${mapping.fieldName}`);
        }
    });

    new cdk.CfnOutput(this, 'GraphQLAPIURL', {
      value: this.api.graphqlUrl,
      description: 'The URL of the GraphQL API',
    });

    if (this.api.apiKey) {
        new cdk.CfnOutput(this, 'GraphQLAPIKey', {
          value: this.api.apiKey,
          description: 'API Key for auxiliary access (if configured)',
        });
    }
  }
} 
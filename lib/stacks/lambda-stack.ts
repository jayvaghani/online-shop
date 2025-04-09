import * as cdk from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as logs from 'aws-cdk-lib/aws-logs';
// No need for path module if using __filename from handlers

// Import the handler functions themselves
import { getAllCategories } from '../lambdas/get-all-categories';
import { getCategoryById } from '../lambdas/get-category-by-id';
import { createCategory } from '../lambdas/create-category';
import { updateCategory } from '../lambdas/update-category';
import { deleteCategory } from '../lambdas/delete-category';
import { getProductsByCategory } from '../lambdas/get-products-by-category';
import { getProductById } from '../lambdas/get-product-by-id';
import { getAllProducts } from '../lambdas/get-all-products';
import { createProduct } from '../lambdas/create-product';
import { updateProduct } from '../lambdas/update-product';
import { deleteProduct } from '../lambdas/delete-product';
import { getCustomer } from '../lambdas/get-customer';
import { listCustomers } from '../lambdas/list-customers';
import { getCustomerByEmail } from '../lambdas/get-customer-by-email';
import { createCustomer } from '../lambdas/create-customer';
import { updateCustomer } from '../lambdas/update-customer';
import { deleteCustomer } from '../lambdas/delete-customer';
import { getOrder } from '../lambdas/get-order';
import { listOrdersByCustomer } from '../lambdas/list-orders-by-customer';
import { listAllOrders } from '../lambdas/list-all-orders';
import { createOrder } from '../lambdas/create-order';
import { updateOrder } from '../lambdas/update-order';
import { getOrderDetails } from '../lambdas/get-order-details';

// Type for the imported handler functions (assuming they have name and path)
interface LambdaHandlerFunction extends Function {
  name: string;
  path: string; // Assuming path was added correctly
}

// Define stack properties including the DynamoDB table
export interface LambdaStackProps extends cdk.StackProps {
  table: dynamodb.Table;
}

export class LambdaStack extends cdk.Stack {
  // Expose functions using their handler names as keys
  public readonly lambdaFunctions: { 
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

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    // Array containing the imported handler function objects
    const lambdaHandlers: LambdaHandlerFunction[] = [
      getAllCategories,
      getCategoryById,
      createCategory,
      updateCategory,
      deleteCategory,
      getProductsByCategory,
      getProductById,
      getAllProducts,
      createProduct,
      updateProduct,
      deleteProduct,
      getCustomer,
      listCustomers,
      getCustomerByEmail,
      createCustomer,
      updateCustomer,
      deleteCustomer,
      getOrder,
      listOrdersByCustomer,
      listAllOrders,
      createOrder,
      updateOrder,
      getOrderDetails,
      // Add other imported handlers here
    ];

    const createdFunctions = {} as Record<keyof typeof this.lambdaFunctions, NodejsFunction>;

    lambdaHandlers.forEach(handlerFunc => {
      if (!handlerFunc.path || !handlerFunc.name) {
        console.error(`Handler function ${handlerFunc} is missing 'path' or 'name' property.`);
        return; // Skip this handler
      }

      // Construct ID based on the handler name
      const functionId = `${handlerFunc.name}Lambda`;

      const lambdaFunction = new NodejsFunction(this, functionId, {
        entry: handlerFunc.path, // Use the path property
        handler: handlerFunc.name, // Use the name property
        runtime: Runtime.NODEJS_22_X, // Update if needed
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        bundling: {
          minify: true,
          sourceMap: true,
          target: 'es2022',
          externalModules: ['@aws-sdk/*'],
        },
        logRetention: logs.RetentionDays.ONE_WEEK,
        environment: {
          TABLE_NAME: props.table.tableName,
        },
      });

      // Grant permissions (simplified - grant read/write + query)
      props.table.grantReadWriteData(lambdaFunction);
      props.table.grant(lambdaFunction, 'dynamodb:Query');

      // Add CloudFormation outputs
      new cdk.CfnOutput(this, `${handlerFunc.name}LogCommand`, {
        value: `aws logs tail /aws/lambda/${lambdaFunction.functionName} --follow`,
        description: `Command to view logs for the ${handlerFunc.name} Lambda function`,
        exportName: `${handlerFunc.name}LogCommand`,
      });

      new cdk.CfnOutput(this, `${handlerFunc.name}InvokeCommand`, {
        value: `aws lambda invoke --function-name ${lambdaFunction.functionName} --payload '{}' response.json`,
        description: `Command to invoke the ${handlerFunc.name} Lambda function`,
        exportName: `${handlerFunc.name}InvokeCommand`,
      });

      createdFunctions[handlerFunc.name as keyof typeof this.lambdaFunctions] = lambdaFunction; // Use handler name as the key
    });

    // Assign created functions to the public property
    this.lambdaFunctions = createdFunctions as typeof this.lambdaFunctions;
  }
} 
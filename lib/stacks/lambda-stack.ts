import * as cdk from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';

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
import { LambdaHandlerFunction } from '../types/lambda';


// Define stack properties including the DynamoDB table
export interface LambdaStackProps extends cdk.StackProps {
  table: dynamodb.Table;
  stepFunctionStateMachineArn: string;
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


    const startStepFunctionPermissionRequired = [
        createOrder.name
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
          // loader: {
          //   '.html': 'text',
          //   '.json': 'json',
          //   '.txt': 'text',            
          // },
          // commandHooks: {
          //   beforeBundling(inputDir: string, outputDir: string): string[] {
          //       try {
          //           // Source directory relative to the project root or lambda entry file
          //           const templateSourceDir = path.join(inputDir, '..', '..', 'templates');
          //           // Destination directory inside the Lambda bundle's output
          //           const templateDestDir = path.join(outputDir, 'templates'); // Copy to a 'templates' subdir in the bundle
   
          //           // Check if source exists before copying
          //           if (fs.existsSync(templateSourceDir)) {
          //               // Use 'cp -r' to copy the directory recursively
          //               // Ensure quotes for paths with spaces
          //               return [`mkdir -p "${templateDestDir}" && cp -r "${templateSourceDir}/"* "${templateDestDir}/"`];
          //           }
          //           return [];
          //       } catch (error) {
          //          console.error("Error setting up commandHooks for template copy:", error);
          //          return [];
          //       }
          //   },
          //   afterBundling(): string[] { return []; },
          //   beforeInstall(): string[] { return []; },
          // },
        },
        logRetention: logs.RetentionDays.ONE_WEEK,
        environment: {
          TABLE_NAME: props.table.tableName,
        },
      });

      // Grant permissions (simplified - grant read/write + query)
      props.table.grantReadWriteData(lambdaFunction);
      props.table.grant(lambdaFunction, 'dynamodb:Query');


      if (startStepFunctionPermissionRequired.includes(handlerFunc.name)) {
        lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
          actions: ['states:StartExecution'],
          resources: [props.stepFunctionStateMachineArn],
          effect: iam.Effect.ALLOW,
        }));
        lambdaFunction.addEnvironment( // Call method on the createOrder Lambda passed in props
            'STATE_MACHINE_ARN',                // Set environment variable named STATE_MACHINE_ARN
            props.stepFunctionStateMachineArn
            //this.orderProcessingStateMachine.stateMachineArn // Use the ARN of the state machine just created
        );
      }

      // Add CloudFormation outputs
      new cdk.CfnOutput(this, `${handlerFunc.name}LogCommand`, {
        value: `aws logs tail /aws/lambda/${lambdaFunction.functionName} --follow`,
        description: `Command to view logs for the ${handlerFunc.name} Lambda function`,
        exportName: `${handlerFunc.name}LogCommand`,
      });

      new cdk.CfnOutput(this, `${handlerFunc.name}InvokeCommand`, {
        value: `aws lambda invoke --function-name ${lambdaFunction.functionName} --payload '${handlerFunc.name === 'sendOrderConfirmation' ? '{"orderId": "YOUR_ORDER_ID"}' : ''}' response.json`,
        description: `Command to invoke the ${handlerFunc.name} Lambda function`,
        exportName: `${handlerFunc.name}InvokeCommand`,
      });

      createdFunctions[handlerFunc.name as keyof typeof this.lambdaFunctions] = lambdaFunction; // Use handler name as the key
    });

    // Assign created functions to the public property
    this.lambdaFunctions = createdFunctions as typeof this.lambdaFunctions;
  }
} 
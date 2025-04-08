import * as cdk from 'aws-cdk-lib';
import {NodejsFunction} from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

// Import all Lambda functions
import { getAllCategories } from '../lambdas/get-all-categories';
import { getCategoryById } from '../lambdas/get-category-by-id';
import { getProductsByCategory } from '../lambdas/get-products-by-category';
import { getProductById } from '../lambdas/get-product-by-id';
import { createProduct } from '../lambdas/create-product';
import { updateProduct } from '../lambdas/update-product';
import { deleteProduct } from '../lambdas/delete-product';

// Define Lambda function configuration type
interface LambdaFunctionConfig {
  path: string;
  name: string;
}

export class LambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define Lambda functions configuration
    const lambdaFunctions: LambdaFunctionConfig[] = [
      { path: getAllCategories.path, name: getAllCategories.name },
      { path: getCategoryById.path, name: getCategoryById.name },
      { path: getProductsByCategory.path, name: getProductsByCategory.name },
      { path: getProductById.path, name: getProductById.name },
      { path: createProduct.path, name: createProduct.name },
      { path: updateProduct.path, name: updateProduct.name },
      { path: deleteProduct.path, name: deleteProduct.name },
    ];

    // Create Lambda functions
    const lambdaFunctionsMap = new Map<string, NodejsFunction>();
    
    lambdaFunctions.forEach(config => {
      const lambdaFunction = new NodejsFunction(this, config.name + 'Function', {
        entry: config.path,
        handler: config.name,
        runtime: Runtime.NODEJS_22_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        bundling: {
          minify: true,
          sourceMap: true,
          target: 'es2022',
          externalModules: ['aws-sdk'],
        },
      });

      // Add CloudFormation output for the Lambda function log command
      new cdk.CfnOutput(this, `${config.name}LogCommand`, {
        value: `aws logs tail /aws/lambda/${lambdaFunction.functionName} --follow`,
        description: `Command to view logs for the ${config.name} Lambda function`,
        exportName: `${config.name}LogCommand`,
      });

      // Add CloudFormation output for the Lambda function invoke command
      new cdk.CfnOutput(this, `${config.name}InvokeCommand`, {
        value: `aws lambda invoke --function-name ${lambdaFunction.functionName} --payload '{}' response.json`,
        description: `Command to invoke the ${config.name} Lambda function`,
        exportName: `${config.name}InvokeCommand`,
      });
      
      lambdaFunctionsMap.set(config.name, lambdaFunction);
    });

    // Create API Gateway resources and methods
    // ... existing code ...
  }
} 
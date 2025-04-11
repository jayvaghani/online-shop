import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as glue from '@aws-cdk/aws-glue-alpha'; // Using alpha module for Glue Table
import { RemovalPolicy, Duration } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { exportOrdersToS3 } from '../lambdas/export-orders-to-s3';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'; // Import dynamodb
import * as athena from 'aws-cdk-lib/aws-athena'; // Import Athena L1 construct
import * as sqs from 'aws-cdk-lib/aws-sqs'; // Import SQS
import * as sns from 'aws-cdk-lib/aws-sns'; // Import SNS
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch'; // Import CloudWatch
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions'; // Explicit import for clarity
import * as logs from 'aws-cdk-lib/aws-logs';

// Interface for stack props, including the DynamoDB table
export interface DataExportStackProps extends cdk.StackProps {
  table: dynamodb.ITable;
  // Add an optional email address for failure notifications
  notificationEmail?: string;
}

export class DataExportStack extends cdk.Stack {
  public readonly dataBucket: s3.IBucket;
  public readonly glueDatabase: glue.IDatabase;
  public readonly glueTable: glue.S3Table;
  public readonly exportLambda: NodejsFunction; // Expose the Lambda function
  public readonly athenaWorkgroup: athena.CfnWorkGroup;
  public readonly deadLetterQueue: sqs.Queue;
  public readonly failureTopic?: sns.Topic;

  constructor(scope: Construct, id: string, props: DataExportStackProps) { // Update props type
    super(scope, id, props);

    const athenaResultsPrefix = '_athena-query-results/'; // Define prefix for query results
    const dataCatalogPrefix = 'data_catalog/';
    // S3 Bucket for storing Parquet data
    this.dataBucket = new s3.Bucket(this, 'OnlineShopOrderDataBucket', {
      // Bucket name should be unique globally, CDK will auto-generate one if not specified
      // Consider adding lifecycle rules for production
      removalPolicy: RemovalPolicy.DESTROY, // DESTROY for easy cleanup in dev, change for prod
      autoDeleteObjects: true, // Automatically delete objects when bucket is deleted (for dev)
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // Best practice
      encryption: s3.BucketEncryption.S3_MANAGED, // Enable server-side encryption
      versioned: false, // Enable versioning if needed
    });

    // Glue Database
    this.glueDatabase = new glue.Database(this, 'OnlineShopOrderDataGlueDatabase', {
      databaseName: 'online_shop_order_data_db', // Choose a suitable name
      locationUri: `s3://${this.dataBucket.bucketName}/${dataCatalogPrefix}`,
      description: 'Database for Online Shop',
    });

    // Glue Table for Athena
    this.glueTable = new glue.S3Table(this, 'OnlineShopOrderDataTable', {
      database: this.glueDatabase,
      tableName: 'online_shop_denormalized_orders', // Choose a suitable name
      description: 'Table for denormalized order line items queryable via Athena',
      columns: [
        { name: 'order_id', type: glue.Schema.STRING },
        { name: 'order_timestamp', type: glue.Schema.TIMESTAMP },
        { name: 'customer_id', type: glue.Schema.STRING },
        { name: 'customer_name', type: glue.Schema.STRING },
        { name: 'address', type: glue.Schema.STRING },
        { name: 'product_id', type: glue.Schema.STRING },
        { name: 'product_name', type: glue.Schema.STRING },
        { name: 'product_unit_price', type: glue.Schema.DOUBLE }, // Use DECIMAL for high precision if needed
        { name: 'quantity', type: glue.Schema.INTEGER },
      ],
      partitionKeys: [
        { name: 'order_date', type: glue.Schema.STRING }, // Partitioned by date (YYYY-MM-DD)
      ],
      dataFormat: glue.DataFormat.PARQUET, // Data is stored in Parquet format
      bucket: this.dataBucket,
      // s3Prefix: 'orders/', // Optional: if you want data under a specific prefix
      storedAsSubDirectories: true, // Necessary for Hive-style partitioning
    });

    // --- Athena Workgroup ---
    this.athenaWorkgroup = new athena.CfnWorkGroup(this, 'ExportAthenaWorkgroup', {
        name: `${this.stackName}-ExportWorkgroup`, // Unique workgroup name
        description: 'Workgroup for the daily order export process',
        state: 'ENABLED',
        workGroupConfiguration: {
            resultConfiguration: {
                outputLocation: `s3://${this.dataBucket.bucketName}/${athenaResultsPrefix}`,
                // Optional: configure encryption
                // encryptionConfiguration: {
                //     encryptionOption: 'SSE_S3', // or SSE_KMS or CSE_KMS
                // },
            },
            // Optional: Enforce workgroup config, require bytes scanned limit, etc.
            // enforceWorkGroupConfiguration: true,
            // bytesScannedCutoffPerQuery: 100000000, // Example: 100MB limit
        },
        recursiveDeleteOption: true, // Allows deleting workgroup even if it has query history
    });

    // --- SQS Dead Letter Queue ---
    this.deadLetterQueue = new sqs.Queue(this, 'OrderExportDLQ', {
        // Consider setting retention period, encryption, etc.
        retentionPeriod: Duration.days(14), 
    });

    // --- SNS Topic for Failures (Optional) ---
    if (props.notificationEmail) {
        this.failureTopic = new sns.Topic(this, 'OrderExportFailureTopic');
        // Automatically subscribe the provided email (requires confirmation)
        new sns.Subscription(this, 'EmailSubscription', {
            topic: this.failureTopic,
            endpoint: props.notificationEmail,
            protocol: sns.SubscriptionProtocol.EMAIL,
        });
    }

    const functionId = exportOrdersToS3.name + "Lambda";
    this.exportLambda = new NodejsFunction(this, functionId, {
      runtime: lambda.Runtime.NODEJS_22_X, // Specify Node.js runtime
      handler: exportOrdersToS3.name,
      entry: exportOrdersToS3.path,
      timeout: Duration.minutes(5), // Set timeout (adjust as needed)
      memorySize: 512, // Adjust memory as needed
      environment: {
        TARGET_BUCKET_NAME: this.dataBucket.bucketName,
        GLUE_DATABASE_NAME: this.glueDatabase.databaseName,
        GLUE_TABLE_NAME: this.glueTable.tableName,
        DYNAMODB_TABLE_NAME: props.table.tableName, // Pass table name from props
        ATHENA_WORKGROUP_NAME: this.athenaWorkgroup.name, // Pass workgroup name
      },
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'es2022',
        externalModules: ['@aws-sdk/*'],
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
      deadLetterQueueEnabled: true, // Enable DLQ
      deadLetterQueue: this.deadLetterQueue, // Assign the SQS queue
    });

    // --- CloudWatch Alarm for Lambda Errors (Optional) ---
    if (this.failureTopic) { // Only create alarm if SNS topic exists
        const lambdaErrorAlarm = new cloudwatch.Alarm(this, 'OrderExportLambdaErrorAlarm', {
            metric: this.exportLambda.metricErrors({ period: Duration.days(1) }),
            threshold: 1,
            evaluationPeriods: 1,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            alarmDescription: 'Alarm triggered if the Order Export Lambda fails one or more times in a 24 hour period.',
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING, // Don't alarm if there are no invocations
        });

        // Add SNS action to the alarm
        lambdaErrorAlarm.addAlarmAction(new SnsAction(this.failureTopic));
    }

    // --- IAM Permissions for Lambda ---
    // Grant read access to the DynamoDB table
    props.table.grantReadData(this.exportLambda);

    // Grant write access to the S3 bucket
    this.dataBucket.grantWrite(this.exportLambda);

    // Grant Athena StartQueryExecution, scoped to the new workgroup
    // Construct the workgroup ARN manually
    const workgroupArn = `arn:aws:athena:${this.region}:${this.account}:workgroup/${this.athenaWorkgroup.name}`;
    this.exportLambda.addToRolePolicy(new iam.PolicyStatement({
        actions: ['athena:StartQueryExecution'],
        resources: [workgroupArn], // Use constructed ARN
    }));
    
    // Grant Glue permissions
    this.exportLambda.addToRolePolicy(new iam.PolicyStatement({
        actions: [
            'glue:GetTable',
            'glue:GetDatabase',
            'glue:CreatePartition',
        ],
        resources: [
            this.glueDatabase.databaseArn,
            this.glueTable.tableArn,
            `arn:aws:glue:${this.region}:${this.account}:catalog`,
        ],
    }));

    // Grant S3 permissions for Athena query results in the specific workgroup location
    this.exportLambda.addToRolePolicy(new iam.PolicyStatement({
        actions: [
            's3:GetObject', 
            's3:PutObject', 
            's3:ListBucket' // ListBucket might be needed by Athena depending on query type/execution plan
        ], 
        resources: [
            this.dataBucket.arnForObjects(`${athenaResultsPrefix}*`), // Access objects under the prefix
            this.dataBucket.bucketArn // Potentially needed for ListBucket on the results prefix
        ],
    }));
    // Additional permission needed by Athena engine itself to write results
    this.dataBucket.grantReadWrite(this.exportLambda, `${athenaResultsPrefix}*`);

    // --- EventBridge Rule (Scheduler) ---
    new events.Rule(this, 'OrderExportScheduleRule', {
      schedule: events.Schedule.cron({ minute: '30', hour: '0' }), // Daily at 00:30 UTC
      targets: [new targets.LambdaFunction(this.exportLambda)],
      description: 'Triggers daily export of order data to S3/Athena',
    });

    // --- Outputs ---
    new cdk.CfnOutput(this, 'OrderDataBucketName', {
      value: this.dataBucket.bucketName,
      description: 'Name of the S3 bucket storing order data',
    });
    new cdk.CfnOutput(this, 'GlueDatabaseName', {
      value: this.glueDatabase.databaseName,
      description: 'Name of the Glue database',
    });
    new cdk.CfnOutput(this, 'GlueTableName', {
      value: this.glueTable.tableName,
      description: 'Name of the Glue table for orders',
    });
    new cdk.CfnOutput(this, 'ExportLambdaFunctionName', {
        value: this.exportLambda.functionName,
        description: 'Name of the Lambda function performing the export',
    });
    new cdk.CfnOutput(this, 'AthenaWorkgroupName', {
        value: this.athenaWorkgroup.name,
        description: 'Name of the Athena Workgroup for export queries',
    });
    new cdk.CfnOutput(this, 'DeadLetterQueueName', {
        value: this.deadLetterQueue.queueName,
        description: 'Name of the SQS DLQ for failed Lambda executions',
    });
    if (this.failureTopic) {
        new cdk.CfnOutput(this, 'FailureNotificationTopicName', {
            value: this.failureTopic.topicName,
            description: 'Name of the SNS topic for failure notifications',
        });
    }
  }
} 
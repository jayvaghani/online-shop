#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { OnlineShopStack } from '../lib/online-shop-stack';
import { getOwner, getStackName } from '../lib/utils/environment';
const app = new cdk.App();

const owner = getOwner()
const senderEmailAddress = process.env.SENDER_EMAIL_ADDRESS as string
const approvalEmailAddress = process.env.APPROVAL_EMAIL_ADDRESS as string

if(!senderEmailAddress || !approvalEmailAddress) {
  throw new Error("SENDER_EMAIL_ADDRESS and APPROVAL_EMAIL_ADDRESS must be set in ENV")
}

new OnlineShopStack(app, getStackName(owner), {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION 
  },
  owner,
  senderEmailAddress,
  approvalEmailAddress,
  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ApplicationOidcStack } from '../lib/oidc-stack';
import { DevMachineStack } from '../lib/dev-machine-stack';

const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region:  process.env.CDK_DEFAULT_REGION, }

const app = new cdk.App();

// Deployed by admin at first and doesn't need to be deployed unless the thumbprint changes.
new ApplicationOidcStack(app, 'RepoOIDC', { env });

new DevMachineStack(app, 'DevMachine', { env });

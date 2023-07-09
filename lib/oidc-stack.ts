import { Stack, StackProps } from 'aws-cdk-lib';

import { Construct } from 'constructs';

import { GithubActionsOidc } from './constructs/actions-oidc';

export class ApplicationOidcStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const appName = this.node.tryGetContext('appName');
    const userName = this.node.tryGetContext('userName');
    const repoName = this.node.tryGetContext('repoName');

    new GithubActionsOidc(this, `${id}ActionsOIDC`, {
      appName, userName, repoName,
    });
  }
}

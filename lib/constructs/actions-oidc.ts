import { Duration, Stack } from 'aws-cdk-lib';
import {
  Effect,
  ManagedPolicy,
  OpenIdConnectPrincipal,
  OpenIdConnectProvider,
  PolicyDocument,
  PolicyStatement,
  Role,
} from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface GithubActionsOidcProps {
  appName: string;
  userName: string;
  repoName: string;
}

// Setup & use GitHub as an OIDC provider for CDK
// - name: Assume role using OIDC
//   uses: aws-actions/configure-aws-credentials@master
//   with:
//     role-to-assume: arn:aws:iam::${{env.aws_account}}:role/${{appName}}-github-ci-role
//
// - name: cdk diff
//   run: npx aws-cdk diff
//
// - name: cdk deploy
//   run: npx aws-cdk deploy --all

export class GithubActionsOidc extends Construct {
  constructor(scope: Construct, id: string, props: GithubActionsOidcProps) {
    super(scope, id);

    const { appName, userName, repoName } = props;

    // There are two possible intermediary certificates for the Actions SSL certificate and either
    // can be returned by the servers, requiring customers to trust both. This is a known behavior
    // when the intermediary certificates are cross-signed by the CA.
    //
    // https://github.com/aws-actions/configure-aws-credentials
    // https://github.blog/changelog/2023-06-27-github-actions-update-on-oidc-integration-with-aws/
    const provider = new OpenIdConnectProvider(this, `${id}Provider`, {
      clientIds: ['sts.amazonaws.com'],
      url: 'https://token.actions.githubusercontent.com',
      thumbprints: [
        '6938fd4d98bab03faadb97b34396831e3780aea1',
        '1c58a3a8518e8759bf075b76b750d4f2df264fcd',
      ],
    });

    const principal = new OpenIdConnectPrincipal(provider).withConditions({
      StringLike: {
        'token.actions.githubusercontent.com:sub': `repo:${userName}/${repoName}:*`,
      },
    });

    new Role(this, `${id}Role`, {
      assumedBy: principal,
      description: 'allow github actions deploy AWS CDK stacks',
      roleName: `${appName}-github-ci-role`,
      maxSessionDuration: Duration.hours(1),
      inlinePolicies: {
        CdkDeployPolicy: new PolicyDocument({
          assignSids: true,
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['sts:AssumeRoleWithWebIdentity'],
              resources: [`arn:aws:iam::${Stack.of(this).account}:role/cdk-*`],
            }),
          ],
        }) 
      },
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')],
    });
  }
}

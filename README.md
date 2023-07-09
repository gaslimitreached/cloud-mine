# Cloud Mine

This is template repo configured for building with the [AWS CDK](https://docs.aws.amazon.com/cdk/api/v2/).

This repository contains the default TypeScript AWS CDK Application. The application is capable of hosting two stacks. `RepoOIDC` and `DevMachine`.

`RepoOIDC` stack creates OIDC principal resources to be used by GitHub Actions and will need to be deployed before running the included actions.

`DevMachine` stack creates an AWS EC2 instance and GitHub Personal Access Token (pat). This stack is created as an example implementation.

This repository also includes `setup` and `teardown` actions to demonstrate deploy and destroy of AWS CDK stacks.

### Included Actions

`.github/workflows`

- `standup.yml`: Deploy development environment. Nodejs (nvm), Python3, Neovim & zsh.
- `teardown.yml`: Destroy development environment.
- `zlog.yml`: Log change event in action workflow.
  - `zlog` is named to appear at the bottom of the workflow actions list.

### CDK Quick Start

`cdk.json` defines the `app` property as `npx ts-node --prefer-ts-exts bin/name.ts`. The app command varies by language and can be suplied to the cdk cli with the `--app` flag.

`bin/name.ts` defines the `cdk.App` that deploys one or more `cdk.Stack`s.

Stacks are defined in the `lib` directory and export your custom defined stack(s).

The `OIDC` provider and `iam.Role` from `lib/construcst/actions-oidc.ts` have administrator privileges.

## Setup

0. [Bootstrap](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html) your AWS Account for CDK if you haven't already.

1. Create the GitHub OIDC Provider (AWS)
    - [Manually](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services) or use the `StackDeployer` provided in this repo.

2. Create the GitHub Personal Access Token and Secret
    - [Create a GitHub Personal Acces Token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
    - [Save as secret](https://docs.aws.amazon.com/secretsmanager/latest/userguide/create_secret.html)
      - SecretString: `"{\"username\":\"octocat\",\"password\":\"github_pat_RANDOMISH\"}"`
      - Record the complete Arn for the next step.

3. Set the [cdk context](https://docs.aws.amazon.com/cdk/v2/guide/cli.html#cli-config) variables in `./cdk.json`.

    - `appName`: Application name
    - `repoName`: GitHub Repository name
    - `userName`: GitHub username
    - `keyName`: Name of existing EC2 [keypair](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-launch-instance-wizard.html#liw-key-pair)
  - `patCompleteArn`

4. Set [variables](https://docs.github.com/en/actions/learn-github-actions/variables) for GitHub actions:

    - `CDK_DEFAULT_ACCOUNT`
    - `CDK_DEFAULT_REGION`
    - `APPNAME`

## Usage

  - Deploy the `DevMachine` stack by [manually](https://docs.github.com/en/actions/using-workflows/manually-running-a-workflow) running the standup action.
  - Get the instance's public DNS name from the deployment output.
  - Connect using the `keypair`.
  - Read/Write code using GitHub Personal Access Token.
    - Use `https` to clone w/ username and pat.
  - Teardown the `DevMachine` stack by manually running the teardown action.
    - The `DevMachine` is removed by name and the teardown workflow will need to be updated to include additional stacks.

### Warnings

- Running this stack incurs charges based on the ec2 `InstanceType`.
  - The instance type used is a `LARGE` `COMPUTE6_INTEL`.
- Deployment takes less than three minutes
- Changes to userData will create a new instance
  - No need to teardown and standup for every change.
- The `DevMachine` stack must be taken down manually and will incur costs for as long as it is running.

## TODO:

- Add alert for idle box or no active connections

import * as cdk from 'aws-cdk-lib';
import {
  Instance,
  InstanceClass,
  InstanceSize,
  InstanceType,
  MachineImage,
  MultipartBody,
  MultipartUserData,
  Port,
  UserData,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class DevMachineStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    const keyName = scope.node.tryGetContext("keyName");
    const secretCompleteArn = scope.node.tryGetContext("patCompleteArn");

    if (keyName == undefined) throw new Error("SSH key name is required");

    if (secretCompleteArn  == undefined) throw new Error("GitHub pat complete arn is required");

    super(scope, id, props);

    const secret = Secret.fromSecretCompleteArn(this, `${id}GitHubPat`, secretCompleteArn);

    // Commands to run on boot
    const multipartUserData = new MultipartUserData();
    const userData = UserData.forLinux();
    multipartUserData.addUserDataPart(userData, MultipartBody.SHELL_SCRIPT, true);

    userData.addCommands(
      // ec2 meta
      `TOKEN=$(curl --request PUT "http://169.254.169.254/latest/api/token" --header "X-aws-ec2-metadata-token-ttl-seconds: 3600")`,
      `echo export AWSREGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/region --header "X-aws-ec2-metadata-token: $TOKEN") >> /etc/profile`,
      // QoL updates
      `HOME=/home/ec2-user`,
      `XDG_CONFIG_HOME=$HOME`,
      `yum remove -y nano`,
      `yum update -y`,
      // Dev tools
      `yum groups install -y "Development tools"`,
      `yum install -y git`,
      `yum install -y cmake`,
      // Python
      `yum install -y python3-{devel,pip}`,
      // github personal access token
      `echo export SECRETARN=${secret.secretFullArn!} >> /etc/profile`,
      `touch /home/ec2-user/github-pat`,
      `echo 'CREDS=$(aws secretsmanager get-secret-value --region $AWSREGION --secret-id $SECRETARN | jq -r '.SecretString')' >> /home/ec2-user/github-pat`,
      `echo 'GITHUB_USERNAME=$(echo $CREDS | jq -r '.username')' >> /home/ec2-user/github-pat`,
      `echo 'GITHUB_PASSWORD=$(echo $CREDS | jq -r '.password')' >> /home/ec2-user/github-pat`,
      // zsh
      `yum install -y zsh`,
      `yum install -y util-linux-user`,
      `chsh -s "$(which zsh)" ec2-user`,
      `ZSH=$HOME/.zshrc`,
      `touch $ZSH`,
      // Node version manager
      `echo 'export NVM_DIR="$HOME/.nvm"' >> $HOME/.zshrc`,
      `echo "lts/*" >> $HOME/.nvmrc`,
      `NVM_DIR=$HOME/.nvm`,
      `echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> $HOME/.zshrc`,
      `curl https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash`,
      `mv /.nvm $HOME`,
      `chown -R ec2-user $HOME/.nvm`,
      // Neovim
      `pip3 install neovim --upgrade`,
      `git clone https://github.com/neovim/neovim.git`,
      `cd neovim`,
      `CMAKE_C_COMPILER=$(which cmake)`,
      `make CMAKE_BUILD_TYPE=Release`,
      `make install`,
      `cd /`,
      `echo 'alias vim="nvim"' >> $HOME/.zshrc`,
      `echo 'export EDITOR="nvim"' >> $HOME/.zshrc`,
      // tmux
      `yum install -y gcc kernel-devel make ncurses-devel`,
      `curl -LOk https://github.com/libevent/libevent/releases/download/release-2.1.11-stable/libevent-2.1.11-stable.tar.gz`,
      `tar -xf libevent-2.1.11-stable.tar.gz`,
      `cd libevent-2.1.11-stable`,
      `./configure --prefix=/usr/local`,
      `make && make install`,
      `cd /`,
      `curl -LOk https://github.com/tmux/tmux/releases/download/3.3a/tmux-3.3a.tar.gz`,
      `tar -xf tmux-3.3a.tar.gz`,
      `cd tmux-3.3a`,
      `LDFLAGS="-L/usr/local/lib -Wl,-rpath=/usr/local/lib" ./configure --prefix=/usr/local`,
      `make && make install`,
    );

    // TODO: use spot instances
    const instance = new Instance(this, `${id}Instance`, {
      vpc: Vpc.fromLookup(this, `${id}DefaultVpcReference`, { isDefault: true }),
      instanceType: InstanceType.of(InstanceClass.COMPUTE6_INTEL, InstanceSize.LARGE),
      machineImage: MachineImage.latestAmazonLinux2023(),
      keyName,
      userData,
      userDataCausesReplacement: true,
    });

    // allow instance to read github personal access token
    secret.grantRead(instance.role!);

    instance.connections.allowFromAnyIpv4(Port.tcp(22));

    new cdk.CfnOutput(this, `${id}PublicDnsName`, {
      value: `${instance.instancePublicDnsName}`,
    });
  }
}

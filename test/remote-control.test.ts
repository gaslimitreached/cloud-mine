import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as RemoteControl from '../lib/dev-machine-stack';

// example resource in lib/remote-control-stack.ts
test('Instance Created', () => {
   const app = new cdk.App();
     // WHEN
   const stack = new RemoteControl.DevMachineStack(app, 'MyTestStack');
     // THEN
   const template = Template.fromStack(stack);

   template.resourceCountIs('AWS::EC2::Instance', 1);
});

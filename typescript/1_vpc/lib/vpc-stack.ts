import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
 import * as vpc from 'aws-cdk-lib/aws-vpc';

export class VpcStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    // The code that defines your stack goes here
    const vpc = new vpc();
  }
}

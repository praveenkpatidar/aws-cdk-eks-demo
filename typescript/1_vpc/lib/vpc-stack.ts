import {BuildConfig} from "./build-config";
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class VpcStack extends Stack {
  constructor(scope: Construct, id: string, buildConfig: BuildConfig, props?: StackProps, ) {
    super(scope, id, props);
    const vpc = new ec2.Vpc(this, 'vpc', {
      cidr: "10.0.0.0/20",
      vpcName: buildConfig.App+"-"+buildConfig.Environment+"-vpc",
      subnetConfiguration: [
        {
          cidrMask: 23,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 23,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
        }
     ]
   })
  }
}

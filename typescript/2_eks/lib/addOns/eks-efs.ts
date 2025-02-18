import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Vpc,
  SecurityGroup,
  SubnetType,
  Port,
  Peer
} from 'aws-cdk-lib/aws-ec2';
import {
  FileSystem,
  PerformanceMode,
  ThroughputMode,
  LifecyclePolicy
} from 'aws-cdk-lib/aws-efs';
import { lookupVpc } from '../../utils/lookupVpc';
import { CommonStackProps } from '../../utils/constants';
export interface EfsStackProps extends CommonStackProps { }

export class EfsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EfsStackProps) {
    super(scope, id, props);
    const namePrefix = `${props.commonConfig.app}-${props.buildConfig.environment}`;
    // Lookup the VPC using the function from lookupVpc.ts
    const vpc = lookupVpc(this, 'Vpc', `${namePrefix}-vpc`);

    // Create a Security Group for the EFS
    const efsSecurityGroup = new SecurityGroup(this, 'EFSSecurityGroup', {
      vpc,
      allowAllOutbound: true,
      description: 'Security Group for EFS',
    });

    // Allow NFS traffic on port 2049 from private subnets only
    const privateSubnets = vpc.selectSubnets({
      subnetType: SubnetType.PRIVATE_WITH_EGRESS,
    });

    privateSubnets.subnets.forEach(subnet => {
      efsSecurityGroup.addIngressRule(
        Peer.ipv4(subnet.ipv4CidrBlock),
        Port.tcp(2049),
        'Allow NFS traffic from VPC private subnets'
      );
    });

    // Create the EFS File System
    const fileSystem = new FileSystem(this, 'EfsFileSystem', {
      vpc,
      securityGroup: efsSecurityGroup,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS, // Adjust subnet type based on your architecture
      },
      performanceMode: PerformanceMode.GENERAL_PURPOSE,
      throughputMode: ThroughputMode.BURSTING,
      lifecyclePolicy: LifecyclePolicy.AFTER_14_DAYS, // Move files to IA storage after 14 days
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Use RETAIN for production environments
    });

    // Output the EFS File System ID
    new cdk.CfnOutput(this, 'EfsFileSystemId', {
      value: fileSystem.fileSystemId,
      description: 'ID of the EFS File System',
      exportName: 'EfsFileSystemId',
    });
  }
}

import {
  BuildSchemaType,
  CommonSchemaType,
} from "../../0_common-config/lib/schema";
import { Stack, StackProps, Tags, CfnOutput } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { CommonStackProps } from "../utils/constants";

export interface VpcStackProps extends CommonStackProps {}

export class VpcStack extends Stack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props: VpcStackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, "vpc", {
      maxAzs: props.buildConfig.networking.maxAzs,
      ipAddresses: ec2.IpAddresses.cidr(props.buildConfig.networking.vpcCidr),
      vpcName: id,
      subnetConfiguration: [
        {
          cidrMask: 23,
          name: "public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 23,
          name: "private",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // Tagging all subnetfor EKSKSTags
    if (props.buildConfig.networking.eksTags) {
      for (const subnet of this.vpc.publicSubnets) {
        Tags.of(subnet).add("kubernetes.io/role/elb", "1");
      }
      for (const subnet of this.vpc.privateSubnets) {
        Tags.of(subnet).add("kubernetes.io/role/internal-elb", "1");
      }
    }

    // Output the VPC ID with an export name
    new CfnOutput(this, "VpcIdOutput", {
      value: this.vpc.vpcId,
      description: "The ID of the VPC used by the EKS Cluster",
      exportName: `${id}-VpcId`, // Export name for cross-stack reference
    });
  }
}

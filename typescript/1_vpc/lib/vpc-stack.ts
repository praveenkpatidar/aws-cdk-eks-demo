import {
  BuildSchemaType,
  CommonSchemaType,
} from "../../0_common-config/lib/schema";
import { Stack, StackProps, Tags } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { CommonStackProps } from "../utils/constants";

export interface VpcStackProps extends CommonStackProps { }

export class VpcStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    props: VpcStackProps,
  ) {
    super(scope, id, props);
    const vpc = new ec2.Vpc(this, "vpc", {
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
      for (const subnet of vpc.publicSubnets) {
        Tags.of(subnet).add("kubernetes.io/role/elb", "1");
      }
      for (const subnet of vpc.privateSubnets) {
        Tags.of(subnet).add("kubernetes.io/role/internal-elb", "1");
      }
    }
  }
}

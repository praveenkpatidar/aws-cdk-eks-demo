// NOT IN USE

import {
  BuildSchemaType,
  CommonSchemaType,
} from "../../0_common-config/lib/schema";
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as eks from "aws-cdk-lib/aws-eks";
import { KubectlV30Layer } from "@aws-cdk/lambda-layer-kubectl-v30";

export interface EksStackProps extends cdk.StackProps {}

export class EksTraditionalStack extends Stack {
  public readonly cluster: eks.Cluster;
  constructor(
    scope: Construct,
    id: string,
    buildConfig: BuildSchemaType,
    commonConfig: CommonSchemaType,
    props?: StackProps,
  ) {
    super(scope, id, props);

    const nameTag = `${commonConfig.app}-${buildConfig.environment}`;
    const vpc1 = ec2.Vpc.fromLookup(this, nameTag + "-vpc", {
      isDefault: false,
      vpcName: `${nameTag}-vpc`,
    });

    // Create a new VPC for our cluster
    const vpc = new ec2.Vpc(this, "EKSVpc", {
      cidr: "10.0.0.0/20",
    });

    // Create Cluster with no default capacity (node group will be added later)
    const eksCluster = new eks.Cluster(this, "EKSCluster", {
      vpc: vpc,
      clusterName: "demo-cluster",
      defaultCapacity: 0,
      mastersRole: new iam.Role(this, "eksAdminRole", {
        assumedBy: new iam.AccountRootPrincipal(),
      }),
      version: eks.KubernetesVersion.V1_30,
      kubectlLayer: new KubectlV30Layer(this, "kubectl"),
      ipFamily: eks.IpFamily.IP_V4,
      clusterLogging: [
        // eks.ClusterLoggingTypes.API,
        // eks.ClusterLoggingTypes.AUTHENTICATOR,
        // eks.ClusterLoggingTypes.SCHEDULER,
        eks.ClusterLoggingTypes.AUDIT,
        // eks.ClusterLoggingTypes.CONTROLLER_MANAGER,
      ],
      outputClusterName: true,
      outputConfigCommand: true,
    });

    eksCluster.addNodegroupCapacity("custom-node-group", {
      amiType: eks.NodegroupAmiType.AL2_X86_64,
      instanceTypes: [new ec2.InstanceType("m5.large")],
      desiredSize: 2,
      diskSize: 20,
      nodeRole: new iam.Role(this, "eksClusterNodeGroupRole", {
        roleName: "eksClusterNodeGroupRole",
        assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "AmazonEKSWorkerNodePolicy",
          ),
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "AmazonEC2ContainerRegistryReadOnly",
          ),
          iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKS_CNI_Policy"),
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "AmazonSSMManagedInstanceCore",
          ),
        ],
      }),
    });

    // Fargate
    const myProfile = new eks.FargateProfile(this, "myProfile", {
      cluster: eksCluster,
      selectors: [{ namespace: "kube-system" }],
    });

    // Managed Addon: kube-proxy
    const kubeProxy = new eks.CfnAddon(this, "addonKubeProxy", {
      addonName: "kube-proxy",
      clusterName: eksCluster.clusterName,
    });

    // Managed Addon: coredns
    const coreDns = new eks.CfnAddon(this, "addonCoreDns", {
      addonName: "coredns",
      clusterName: eksCluster.clusterName,
    });

    // Managed Addon: vpc-cni
    const vpcCni = new eks.CfnAddon(this, "addonVpcCni", {
      addonName: "vpc-cni",
      clusterName: eksCluster.clusterName,
    });
  }
}

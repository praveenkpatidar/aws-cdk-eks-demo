import {
  BuildSchemaType,
  CommonSchemaType,
} from "../../0_common-config/lib/schema";
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as blueprints from "@aws-quickstart/eks-blueprints";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import {
  KubernetesVersion,
  NodegroupAmiType,
  Cluster,
} from "aws-cdk-lib/aws-eks";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { CommonStackProps, coreTolerations } from "../utils/constants";
export interface EksStackProps extends CommonStackProps { }
export class EksStack extends Stack {
  constructor(scope: Construct, id: string, props: EksStackProps) {
    super(scope, id, props);
    const namePrefix = `${props.commonConfig.app}-${props.buildConfig.environment}`;
    const eksConfig = props.buildConfig.eksConfig;
    blueprints.HelmAddOn.validateHelmVersions = true;
    blueprints.HelmAddOn.failOnVersionValidation = false;
    const nameTag = namePrefix;
    const addOns: Array<blueprints.ClusterAddOn> = [
      // keep only AWS AddOns
      new blueprints.CoreDnsAddOn(),
      new blueprints.addons.KubeProxyAddOn(),
      new blueprints.addons.VpcCniAddOn(),
      new blueprints.addons.EksPodIdentityAgentAddOn(),
      new blueprints.addons.AwsLoadBalancerControllerAddOn({
        values: {
          tolerations: [coreTolerations],
        },
      }),
    ];
    const adminRole =
      "arn:aws:iam::" +
      props.buildConfig.awsAccountID +
      ":role/AWSReservedSSO_AdministratorAccess_03ad70a269de0fe1"; // Need to put this in parameters
    const nodeRole = new blueprints.CreateRoleProvider(
      "node-role",
      new iam.ServicePrincipal("ec2.amazonaws.com"),
      [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKSWorkerNodePolicy"),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonEC2ContainerRegistryReadOnly",
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore",
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKS_CNI_Policy"),
      ],
    );

    const platformTeam = new blueprints.PlatformTeam({
      name: "platform-admin",
      userRoleArn: adminRole,
    });

    const metaStack = new cdk.Stack(this, nameTag + "-vpc-metadata", {
      env: {
        region: props.commonConfig.awsRegion,
        account: props.buildConfig.awsAccountID,
      },
    });

    const Vpc = ec2.Vpc.fromLookup(metaStack, nameTag + "-vpc", {
      isDefault: false,
      vpcName: nameTag + "-vpc",
    });

    const clusterProvider = new blueprints.GenericClusterProvider({
      // Temp Arrangement to drive the EKSVersion. With new Version the LamndaLayer also need to be changed.
      // If condition can keep 2 versions between the environments.
      version:
        eksConfig.eksVersion == "1.30"
          ? KubernetesVersion.V1_30
          : KubernetesVersion.V1_29,
      vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
      mastersRole: blueprints.getResource((context) => {
        return new iam.Role(context.scope, "AdminRole", {
          roleName: `${namePrefix}-adminrole`,
          assumedBy: new iam.AccountRootPrincipal(),
        });
      }),
      managedNodeGroups: [
        {
          id: nameTag + "-cluster-nodegroup-1",
          amiType: NodegroupAmiType.AL2_X86_64,
          desiredSize: eksConfig.coreNode.minCount,
          maxSize: eksConfig.coreNode.maxCount,
          nodeRole: blueprints.getNamedResource("node-role") as iam.Role,
          instanceTypes: [new ec2.InstanceType("m4.large")],
          nodeGroupSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
          launchTemplate: {
            tags: {
              Name: nameTag + "-core-nodegroup",
              Type: "Managed-Node-Group",
              LaunchTemplate: "Custom",
              Instance: eksConfig.coreNode.instance, // Should be OnDemand but for cost saving let it be Spot
              Project: props.commonConfig.app,
            },
          },
          labels: {
            dedicated: "cluster-core",
          },
          taints: [
            {
              key: "CriticalAddonsOnly",
              value: "true",
              effect: cdk.aws_eks.TaintEffect.NO_SCHEDULE,
            },
          ],
        },
      ],
    });
    const clusterStack = blueprints.EksBlueprint.builder()
      .account(props.buildConfig.awsAccountID)
      .region(props.commonConfig.awsRegion)
      .resourceProvider(
        blueprints.GlobalResources.Vpc,
        new blueprints.VpcProvider(Vpc.vpcId),
      )
      .resourceProvider("node-role", nodeRole)
      .addOns(...addOns)
      .clusterProvider(clusterProvider)
      .enableControlPlaneLogTypes(blueprints.ControlPlaneLogType.API)
      .useDefaultSecretEncryption(true) // set to false to turn secret encryption off (non-production/demo cases)
      .teams(platformTeam)
      .build(this, `${namePrefix}`);

    const cluster = clusterStack.getClusterInfo().cluster as Cluster;
    const providerArn = cluster.openIdConnectProvider.openIdConnectProviderArn;
    const ssmOicdProviderArn = new ssm.StringParameter(this, "oicdProvider", {
      parameterName: `${namePrefix}-oidc-provider-arn`,
      stringValue: providerArn,
    });
    const ssmClusterEndpoint = new ssm.StringParameter(
      this,
      "clusterEndpoint",
      {
        parameterName: `${namePrefix}-cluster-endpoint`,
        stringValue: cluster.clusterEndpoint,
      },
    );

    // Add Karpenter node role to the aws-auth ConfigMap
    const karpenterNodeRole = new iam.Role(clusterStack, "karpenterNodeRole", {
      roleName: `${namePrefix}-karpenterNodeRole`,
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKSWorkerNodePolicy"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKS_CNI_Policy"),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonEC2ContainerRegistryReadOnly",
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore",
        ),
      ],
    });

    // Create the instance profile for the IAM role to be used in Karpenter Nodes
    const instanceProfile = new iam.CfnInstanceProfile(
      clusterStack,
      "InstanceProfile",
      {
        roles: [karpenterNodeRole.roleName],
        instanceProfileName: `${namePrefix}-karpenterNodeRole-instanceProfile`,
      },
    );
    // Add Karpenter NodeRole in AWS-Auth
    cluster.awsAuth.addRoleMapping(karpenterNodeRole, {
      groups: ["system:bootstrappers", "system:nodes"],
      username: "system:node:{{EC2PrivateDNSName}}",
    });
  }
}

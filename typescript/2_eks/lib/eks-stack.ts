import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BuildConfig } from './build-config';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { KubernetesVersion, Nodegroup, NodegroupAmiType, TaintEffect } from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';


export class EksStack extends cdk.Stack {
  constructor(scope: Construct, id: string, buildConfig: BuildConfig, props?: cdk.StackProps,) {
    super(scope, id, props);
    blueprints.HelmAddOn.validateHelmVersions = true;
    blueprints.HelmAddOn.failOnVersionValidation = false;
    const nameTag = buildConfig.App + "-" + buildConfig.Environment
    const addOns: Array<blueprints.ClusterAddOn> = [
      // keep only AWS AddOns No HelmFile based AddOns
      new blueprints.addons.AwsLoadBalancerControllerAddOn(),
      new blueprints.addons.CoreDnsAddOn(),
      new blueprints.addons.KubeProxyAddOn(),
      new blueprints.addons.VpcCniAddOn(),
    ];
    const adminRole = "arn:aws:iam::" + buildConfig.AWSAccountID + ":role/AWSReservedSSO_AdministratorAccess_03ad70a269de0fe1"  // Need to put this in parameters

    const Vpc = ec2.Vpc.fromLookup(this, nameTag + "-vpc", {
      isDefault: false,
      vpcName: nameTag + "-vpc"
    })

    const clusterProvider = new blueprints.GenericClusterProvider({
      version: KubernetesVersion.V1_28,
      vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
      mastersRole: blueprints.getResource(context => {
        return new iam.Role(context.scope, 'AdminRole', { assumedBy: new iam.AccountRootPrincipal() });
      }),
      managedNodeGroups: [
        {
          id: nameTag + "-cluster-nodegroup",
          amiType: NodegroupAmiType.AL2_X86_64,
          desiredSize: 1,
          maxSize: 1,
          instanceTypes: [new ec2.InstanceType('m4.large')],
          nodeGroupSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
          launchTemplate: {
            // You can pass Custom Tags to Launch Templates which gets propagated to worker nodes.
            tags: {
              "Name": nameTag + "-core-nodegroup",
              "Type": "Managed-Node-Group",
              "LaunchTemplate": "Custom",
              "Instance": "SPOT", // Should be OnDemand but for cost saving let it be Spot
              "Project": buildConfig.App
            }
          },
          labels: {
            'dedicated': 'cluster-core'
          }
        }
      ]

    })

    const platformTeam = new blueprints.PlatformTeam({
      name: "platform-admin",
      userRoleArn: adminRole
    })


    const stack = blueprints.EksBlueprint.builder()
      .account(buildConfig.AWSAccountID)
      .region(buildConfig.AWSProfileRegion)
      .resourceProvider(blueprints.GlobalResources.Vpc, new blueprints.VpcProvider(Vpc.vpcId))
      .addOns(...addOns)
      .clusterProvider(clusterProvider)
      .enableControlPlaneLogTypes(blueprints.ControlPlaneLogType.API)
      .useDefaultSecretEncryption(true) // set to false to turn secret encryption off (non-production/demo cases)
      .teams(platformTeam)
      .build(this, nameTag + "-cluster");
  }
}

import { Stack, StackProps, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BuildConfig } from './build-config';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import * as  ec2 from "aws-cdk-lib/aws-ec2";
import { KubernetesVersion, Nodegroup, NodegroupAmiType, TaintEffect } from 'aws-cdk-lib/aws-eks';

export class EksStack extends Stack {
  constructor(scope: Construct, id: string, buildConfig: BuildConfig, props?: StackProps,) {
    super(scope, id, props);
    blueprints.HelmAddOn.validateHelmVersions = true;
    blueprints.HelmAddOn.failOnVersionValidation = false;
    const nameTag = buildConfig.App + "-" + buildConfig.Environment
    const addOns: Array<blueprints.ClusterAddOn> = [
      new blueprints.addons.ArgoCDAddOn(),
      new blueprints.addons.AwsLoadBalancerControllerAddOn(),
      new blueprints.addons.CoreDnsAddOn(),
      new blueprints.addons.KarpenterAddOn(),
      new blueprints.addons.KubeProxyAddOn(),
      new blueprints.addons.KubeStateMetricsAddOn(),
      new blueprints.addons.MetricsServerAddOn(),
      new blueprints.addons.VpcCniAddOn(),
    ];
    const Vpc = ec2.Vpc.fromLookup(this, nameTag + "-vpc", {
      isDefault: false,
      vpcName: nameTag + "-vpc"
    })

    const clusterProvider = new blueprints.GenericClusterProvider({
      version: blueprints.Version,
      vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
      /*     mastersRole: blueprints.getResource(context => {
             return new Role(context.scope, nameTag + '-adminrole', { assumedBy: new AccountRootPrincipal() });
           }),
           managedNodeGroups: [
                   {
                     id: nameTag + "-cluster-nodegroup",
                     amiType: NodegroupAmiType.AL2_X86_64,
                     instanceTypes: [new ec2.InstanceType('m4.large')],
                     desiredSize: 2,
                     maxSize: 3,
                     nodeGroupSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
                     launchTemplate: {
                       // You can pass Custom Tags to Launch Templates which gets propagated to worker nodes.
                       customTags: {
                         "Name": nameTag + "-cluster-nodegroup",
                         "Type": "Managed-Node-Group",
                         "LaunchTemplate": "Custom",
                         "Instance": "ONDEMAND",
                         "Project": buildConfig.App
                       }
                     },
                     taints: [{
                       effect: TaintEffect.NO_SCHEDULE,
                       key: 'dedicated',
                       value: 'cluster-core',
                     }],
                     labels: {
                       'dedicated': 'cluster-core'
                     }
                   }
                 ]
           */
    })

    const stack = blueprints.EksBlueprint.builder()
      .account(buildConfig.AWSAccountID)
      .region(buildConfig.AWSProfileRegion)
      .resourceProvider(blueprints.GlobalResources.Vpc, new blueprints.VpcProvider(Vpc.vpcId))
      .addOns(...addOns)
      .clusterProvider(clusterProvider)
      .enableControlPlaneLogTypes(blueprints.ControlPlaneLogType.API)
      .useDefaultSecretEncryption(true) // set to false to turn secret encryption off (non-production/demo cases)
      .build(this, "cluster");
  }
}

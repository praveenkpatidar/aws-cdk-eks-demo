import { Stack, StackProps, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BuildConfig } from './build-config';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import * as  ec2 from "aws-cdk-lib/aws-ec2";
import { KubernetesVersion, Nodegroup } from 'aws-cdk-lib/aws-eks';
import { AccountRootPrincipal, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
export class EksStack extends Stack {
  constructor(scope: Construct, id: string, buildConfig: BuildConfig, props?: StackProps,) {
    super(scope, id, props);
    blueprints.HelmAddOn.validateHelmVersions = true;
    blueprints.HelmAddOn.failOnVersionValidation = false;

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
    const Vpc = ec2.Vpc.fromLookup(this, buildConfig.App + "-" + buildConfig.Environment + "-vpc", {
      isDefault: false,
      vpcName: buildConfig.App + "-" + buildConfig.Environment + "-vpc"
    })

    const clusterProvider = new blueprints.GenericClusterProvider({
      version: KubernetesVersion.V1_24,
      vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
      mastersRole: blueprints.getResource(context => {
        return new Role(context.scope, 'AdminRole', { assumedBy: new AccountRootPrincipal() });
      }),

    })

    const stack = blueprints.EksBlueprint.builder()
      .account(buildConfig.AWSAccountID)
      .region(buildConfig.AWSProfileRegion)
      .resourceProvider(blueprints.GlobalResources.Vpc, new blueprints.VpcProvider(Vpc.vpcId))
      .addOns(...addOns)
      .clusterProvider(clusterProvider)
      .enableControlPlaneLogTypes(blueprints.ControlPlaneLogType.API)
      .useDefaultSecretEncryption(true) // set to false to turn secret encryption off (non-production/demo cases)
      .build(this, buildConfig.App + "-" + buildConfig.Environment + "-cluster");

  }
}

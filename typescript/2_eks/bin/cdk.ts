#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Config } from "../../0_common_config/lib/config";
import { loadConfig } from "../../0_common_config/lib/utils";
import * as blueprints from '@aws-quickstart/eks-blueprints';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { KubernetesVersion, Nodegroup, NodegroupAmiType, TaintEffect } from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';
const app = new cdk.App();
const env = app.node.tryGetContext('env')
let config: Config = loadConfig(env);
const awsEnv = {
    region: config.AWSProfileRegion,
    account: config.AWSAccountID
}


blueprints.HelmAddOn.validateHelmVersions = true;
blueprints.HelmAddOn.failOnVersionValidation = false;
const nameTag = config.App + "-" + config.Environment
const addOns: Array<blueprints.ClusterAddOn> = [
    // keep only AWS AddOns No HelmFile based AddOns
    new blueprints.addons.CoreDnsAddOn(),
    new blueprints.addons.KubeProxyAddOn(),
    new blueprints.addons.VpcCniAddOn(),
    new blueprints.addons.EksPodIdentityAgentAddOn(),
    new blueprints.addons.KarpenterAddOn({
        values:
        {
            replicas: 1,
            logLevel: 'debug',
            tolerations: [
                {
                    key: "node-role.kubernetes.io/master",
                    effect: "NoSchedule"
                }
            ]
        }
    }),
];
const adminRole = "arn:aws:iam::" + config.AWSAccountID + ":role/AWSReservedSSO_AdministratorAccess_03ad70a269de0fe1"  // Need to put this in parameters

const metaStack = new cdk.Stack(app, nameTag + "-vpc-metadata", { env: awsEnv })

const Vpc = ec2.Vpc.fromLookup(metaStack, nameTag + "-vpc", {
    isDefault: false,
    vpcName: nameTag + "-vpc"
})

const clusterProvider = new blueprints.GenericClusterProvider({
    version: KubernetesVersion.V1_29,
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
                    "Project": config.App
                }
            },
            labels: {
                "dedicated": "cluster-core"
            },
            taints: [{
                key: "node-role.kubernetes.io/master",
                effect: cdk.aws_eks.TaintEffect.NO_SCHEDULE
            }]
        }
    ]
})

const platformTeam = new blueprints.PlatformTeam({
    name: "platform-admin",
    userRoleArn: adminRole
})


const stack = blueprints.EksBlueprint.builder()
    .account(config.AWSAccountID)
    .region(config.AWSProfileRegion)
    .resourceProvider(blueprints.GlobalResources.Vpc, new blueprints.VpcProvider(Vpc.vpcId))
    .addOns(...addOns)
    .clusterProvider(clusterProvider)
    .enableControlPlaneLogTypes(blueprints.ControlPlaneLogType.API)
    .useDefaultSecretEncryption(true) // set to false to turn secret encryption off (non-production/demo cases)
    .teams(platformTeam)
    .build(app, nameTag + "-cluster");

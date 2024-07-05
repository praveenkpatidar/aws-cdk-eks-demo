#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {
    BuildSchemaType,
    CommonSchemaType,
    buildSchema,
    commonSchema,
    loadConfig,
} from "../../0_common-config";
import { EksStack } from '../lib/eks-stack';
//import { LoadBalancerControllerStack } from '../lib/addOns/eks-lb-controller';
//import { PrometheusKubeStack } from '../lib/addOns/eks-prom-stack';
//import { KarpenterStack } from '../lib/addOns/eks-karpenter-stack';


const app = new cdk.App();
const envName = app.node.tryGetContext("envName");
if (!envName) {
    throw new Error(`Could not find environment Variable envName s`);
}
const buildConfig: BuildSchemaType = loadConfig(envName, buildSchema);
const commonConfig: CommonSchemaType = loadConfig("common", commonSchema);

let nameTag = `${commonConfig.App}-${envName}`;


const eksStack = new EksStack(app, `${nameTag}-eks`, buildConfig, commonConfig, {
    env: {
        region: commonConfig.AWSRegion,
        account: buildConfig.AWSAccountID,
    },
});

/*
// Add Prometheus Kube Stack
const karpenterStack = new KarpenterStack(app, `${nameTag}-eks-karpenter`, {
    cluster: eksStack.cluster,
}).node.addDependency(eksStack);

// Add Load Balancer Controller Stack
const lbStack = new LoadBalancerControllerStack(app, `${nameTag}-eks-lb-controller`, {
    cluster: eksStack.cluster,
}).node.addDependency(eksStack);

// Add Prometheus Kube Stack
const promStack = new PrometheusKubeStack(app, `${nameTag}-eks-prometheus`, {
    cluster: eksStack.cluster,
}).node.addDependency(eksStack);

*/


/*
blueprints.HelmAddOn.validateHelmVersions = true;
blueprints.HelmAddOn.failOnVersionValidation = false;
const nameTag = commonConfig.App + "-" + buildConfig.Environment
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
const adminRole = "arn:aws:iam::" + buildConfig.AWSAccountID + ":role/AWSReservedSSO_AdministratorAccess_03ad70a269de0fe1"  // Need to put this in parameters

const metaStack = new cdk.Stack(app, nameTag + "-vpc-metadata", {
    env: {
        region: commonConfig.AWSRegion,
        account: buildConfig.AWSAccountID,
    },
})

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
                    "Project": commonConfig.App
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
    .account(buildConfig.AWSAccountID)
    .region(commonConfig.AWSRegion)
    .resourceProvider(blueprints.GlobalResources.Vpc, new blueprints.VpcProvider(Vpc.vpcId))
    .addOns(...addOns)
    .clusterProvider(clusterProvider)
    .enableControlPlaneLogTypes(blueprints.ControlPlaneLogType.API)
    .useDefaultSecretEncryption(true) // set to false to turn secret encryption off (non-production/demo cases)
    .teams(platformTeam)
    .build(app, nameTag + "-cluster");
*/

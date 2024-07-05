import {
    BuildSchemaType,
    CommonSchemaType,
} from "../../0_common-config/lib/schema";
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as blueprints from '@aws-quickstart/eks-blueprints';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { KubernetesVersion, NodegroupAmiType } from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';

export class EksStack extends Stack {
    constructor(
        scope: Construct,
        id: string,
        buildConfig: BuildSchemaType,
        commonConfig: CommonSchemaType,
        props?: StackProps,
    ) {
        super(scope, id, props);

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

        const metaStack = new cdk.Stack(this, nameTag + "-vpc-metadata", {
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
            .build(this, "cluster");

    }
}

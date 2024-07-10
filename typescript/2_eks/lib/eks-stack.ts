import {
    BuildSchemaType,
    CommonSchemaType,
} from "../../0_common-config/lib/schema";
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as blueprints from '@aws-quickstart/eks-blueprints';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { KubernetesVersion, NodegroupAmiType, Cluster } from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Values } from "aws-cdk-lib/aws-cloudwatch";
export interface EksStackProps extends cdk.StackProps {

}
export class EksStack extends Stack {
    public readonly cluster: Cluster;
    constructor(
        scope: Construct,
        id: string,
        buildConfig: BuildSchemaType,
        commonConfig: CommonSchemaType,
        props?: EksStackProps,
    ) {
        super(scope, id, props);

        blueprints.HelmAddOn.validateHelmVersions = true;
        blueprints.HelmAddOn.failOnVersionValidation = false;
        const nameTag = commonConfig.App + "-" + buildConfig.Environment
        const addOns: Array<blueprints.ClusterAddOn> = [
            // keep only AWS AddOns
            new blueprints.CoreDnsAddOn(),
            new blueprints.addons.KubeProxyAddOn(),
            new blueprints.addons.VpcCniAddOn(),
            new blueprints.addons.EksPodIdentityAgentAddOn()
        ];
        const adminRole = "arn:aws:iam::" + buildConfig.AWSAccountID + ":role/AWSReservedSSO_AdministratorAccess_03ad70a269de0fe1"  // Need to put this in parameters
        const adminIamRole = iam.Role.fromRoleArn(this, "AdminIamRole", adminRole);
        console.log(adminIamRole.roleArn);
        const nodeRole = new blueprints.CreateRoleProvider("node-role", new iam.ServicePrincipal("ec2.amazonaws.com"),
            [
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKSWorkerNodePolicy"),
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEC2ContainerRegistryReadOnly"),
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"),
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKS_CNI_Policy")
            ]);

        const platformTeam = new blueprints.PlatformTeam({
            name: "platform-admin",
            userRoleArn: adminRole
        })

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
            version: KubernetesVersion.V1_30,
            vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
            mastersRole: blueprints.getResource(context => {
                return new iam.Role(context.scope, 'AdminRole', { assumedBy: new iam.AccountRootPrincipal() });
            }),
            managedNodeGroups: [
                {
                    id: nameTag + "-cluster-nodegroup-1",
                    amiType: NodegroupAmiType.AL2_X86_64,
                    desiredSize: 1,
                    maxSize: 1,
                    nodeRole: blueprints.getNamedResource("node-role") as iam.Role,
                    instanceTypes: [new ec2.InstanceType('m4.large')],
                    nodeGroupSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
                    launchTemplate: {
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
                    taints: [
                        {
                            key: "CriticalAddonsOnly",
                            value: "true",
                            effect: cdk.aws_eks.TaintEffect.NO_SCHEDULE
                        }
                    ]
                }
            ]
        })
        const clusterStack = blueprints.EksBlueprint.builder()
            .account(buildConfig.AWSAccountID)
            .region(commonConfig.AWSRegion)
            .resourceProvider(blueprints.GlobalResources.Vpc, new blueprints.VpcProvider(Vpc.vpcId))
            .resourceProvider("node-role", nodeRole)
            .addOns(...addOns)
            .clusterProvider(clusterProvider)
            .enableControlPlaneLogTypes(blueprints.ControlPlaneLogType.API)
            .useDefaultSecretEncryption(true) // set to false to turn secret encryption off (non-production/demo cases)
            .teams(platformTeam)
            .build(this, `${commonConfig.App}-${buildConfig.Environment}`);

    }
}

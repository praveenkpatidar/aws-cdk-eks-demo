import {
    BuildSchemaType,
    CommonSchemaType,
} from "../../0_common-config/lib/schema";
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cdk from 'aws-cdk-lib';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from 'aws-cdk-lib/aws-iam';
import * as eks from 'aws-cdk-lib/aws-eks';


export interface EksStackProps extends cdk.StackProps {
}


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

        const nameTag = `${commonConfig.App}-${buildConfig.Environment}`
        const vpc = ec2.Vpc.fromLookup(this, nameTag + "-vpc", {
            isDefault: false,
            vpcName: `${nameTag}-vpc`
        })

        // Create the EKS cluster
        this.cluster = new eks.Cluster(this, 'cluster', {
            vpc: vpc,
            clusterName: `${nameTag}`,
            vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
            defaultCapacity: 0, // we want to manage capacity ourselves
            version: eks.KubernetesVersion.V1_30,
            clusterLogging: [
                eks.ClusterLoggingTypes.API,
                eks.ClusterLoggingTypes.AUDIT,
                eks.ClusterLoggingTypes.AUTHENTICATOR,
                eks.ClusterLoggingTypes.CONTROLLER_MANAGER,
                eks.ClusterLoggingTypes.SCHEDULER,
            ],
        });

        // Add CoreDNS add-on
        new eks.CfnAddon(this, 'CoreDnsAddon', {
            addonName: 'coredns',
            clusterName: this.cluster.clusterName,
            addonVersion: 'v1.11.1-eksbuild.8', // Adjust version as needed
        });

        // Add KubeProxy add-on
        new eks.CfnAddon(this, 'KubeProxyAddon', {
            addonName: 'kube-proxy',
            clusterName: this.cluster.clusterName,
            addonVersion: 'v1.30.0-eksbuild.3', // Adjust version as needed
        });

        // Add VPC CNI add-on
        new eks.CfnAddon(this, 'VpcCniAddon', {
            addonName: 'vpc-cni',
            clusterName: this.cluster.clusterName,
            addonVersion: 'v1.18.1-eksbuild.3', // Adjust version as needed
        });

        // Add Pod Identity Webhook add-on
        /* new eks.CfnAddon(this, 'PodIdentityAddon', {
             addonName: 'eks-pod-identity-agent',
             clusterName: this.cluster.clusterName,
             addonVersion: 'v1.3.0-eksbuild.1', // Adjust version as needed
         });
         */

        // Create nodegroup role
        const nodegroupRole = new iam.Role(this, 'NodegroupRole', {
            roleName: `${nameTag}-NodegroupRole`,
            // Add any necessary permissions here
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSWorkerNodePolicy'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKS_CNI_Policy'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy')
            ],
        });

        // Create a node group
        this.cluster.addNodegroupCapacity("ClusterCoreNodeGroup", {
            instanceTypes: [new ec2.InstanceType('t2.medium')],
            nodegroupName: `${nameTag}-cluster-core-ng`,
            desiredSize: 1,
            minSize: 1,
            maxSize: 2,
            nodeRole: nodegroupRole,
            subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            // You can pass Custom Tags to Launch Templates which gets propagated to worker nodes.
            tags: {
                "Name": nameTag + "-core-nodegroup",
                "Type": "Managed-Node-Group",
                "LaunchTemplate": "Custom",
                "Instance": "SPOT", // Should be OnDemand but for cost saving let it be Spot
                "Project": commonConfig.App
            },
            labels: {
                "dedicated": "core"
            },
            taints: [{
                key: "node-role.kubernetes.io/master",
                effect: cdk.aws_eks.TaintEffect.NO_SCHEDULE
            }]
        });

        // Adding role to aws-auth
        const role = iam.Role.fromRoleArn(this, 'MyRole', `arn:aws:iam::${buildConfig.AWSAccountID}:role/WSReservedSSO_AdministratorAccess_03ad70a269de0fe1`);
        this.cluster.awsAuth.addMastersRole(role);
    }
}

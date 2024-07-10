import * as cdk from 'aws-cdk-lib';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface KarpenterStackProps extends cdk.StackProps {
    cluster: eks.Cluster;
}

export class KarpenterStack extends cdk.Stack {

    constructor(scope: cdk.App, id: string, props: KarpenterStackProps) {
        super(scope, id, props);

        const { cluster } = props;

        // Create a Kubernetes service account for Karpenter
        const karpenterServiceAccount = cluster.addServiceAccount('karpenterServiceAccount', {
            name: 'karpenter-sa',
            namespace: 'karpenter'
        });


        const karpenterPolicy = new iam.ManagedPolicy(this, 'KarpenterPolicy', {
            managedPolicyName: 'KarpenterPolicy',
            statements: [
                new iam.PolicyStatement({
                    actions: [
                        'ec2:CreateLaunchTemplate',
                        'ec2:CreateFleet',
                        'ec2:RunInstances',
                        'ec2:CreateTags',
                        'ec2:TerminateInstances',
                        'ec2:DescribeLaunchTemplates',
                        'ec2:DescribeInstances',
                        'ec2:DescribeSecurityGroups',
                        'ec2:DescribeSubnets',
                        'ec2:DescribeInstanceTypes',
                        'eks:DescribeNodegroup',
                        'eks:DescribeCluster',
                        'iam:PassRole',
                    ],
                    resources: ['*'],
                }),
            ],
        });
        karpenterPolicy.node.addDependency(karpenterServiceAccount);

        karpenterServiceAccount.role.addManagedPolicy(
            iam.ManagedPolicy.fromAwsManagedPolicyName(karpenterPolicy.managedPolicyName)
        );
        // Install Karpenter using Helm
        const karpenterChart = cluster.addHelmChart('KarpenterHelmChart', {
            chart: 'karpenter',
            repository: 'oci://public.ecr.aws/karpenter/karpenter',
            namespace: 'karpenter',
            release: 'karpenter',
            version: '0.36.0', // Adjust version as needed
            values: {
                serviceAccount: {
                    create: false,
                    name: karpenterServiceAccount.serviceAccountName
                },
                tolerations: [
                    {
                        key: "node-role.kubernetes.io/master",
                        effect: "NoSchedule"
                    }
                ],
                clusterName: cluster.clusterName,
                clusterEndpoint: cluster.clusterEndpoint,
                aws: {
                    defaultInstanceProfile: 'KarpenterNodeInstanceProfile', // Ensure this IAM instance profile exists
                },
            },
        });
        karpenterChart.node.addDependency(karpenterServiceAccount);
    }
}

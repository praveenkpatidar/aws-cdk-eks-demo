import * as cdk from 'aws-cdk-lib';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface LoadBalancerControllerStackProps extends cdk.StackProps {
    cluster: eks.Cluster;
}

export class LoadBalancerControllerStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props: LoadBalancerControllerStackProps) {
        super(scope, id, props);

        const { cluster } = props;

        // Create the service account for the Load Balancer Controller
        const sa = cluster.addServiceAccount('AWSLoadBalancerController', {
            name: 'aws-load-balancer-controller',
            namespace: 'kube-system',
        });

        // Attach the required policies to the service account
        sa.role.addManagedPolicy(
            iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSClusterPolicy')
        );
        sa.role.addManagedPolicy(
            iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSVPCResourceController')
        );

        // Deploy the AWS Load Balancer Controller using Helm
        cluster.addHelmChart('AWSLoadBalancerController', {
            chart: 'aws-load-balancer-controller',
            repository: 'https://aws.github.io/eks-charts',
            namespace: 'kube-system',
            release: 'aws-load-balancer-controller',
            values: {
                clusterName: cluster.clusterName,
                serviceAccount: {
                    create: false,
                    name: sa.serviceAccountName,
                },
                region: this.region,
                vpcId: cluster.vpc.vpcId,
            },
        });
    }
}

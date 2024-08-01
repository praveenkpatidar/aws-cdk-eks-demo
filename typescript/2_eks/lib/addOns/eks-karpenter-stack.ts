import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { SqsQueue } from 'aws-cdk-lib/aws-events-targets';
import { Rule } from 'aws-cdk-lib/aws-events';
import * as iam from 'aws-cdk-lib/aws-iam';
import {
    BuildSchemaType,
    CommonSchemaType,
} from "../../../0_common-config/lib/schema";
import { lookUpEksCluster } from '../../utils/getEksCluster';
import { createServiceAccountIrsaRole } from '../../utils/serviceAccountIrsaRole';
import { getKarpenterControllerPolicyDocument } from '../../utils/karpenterIam';

export interface KarpenterStackProps extends cdk.StackProps {
}
// NOTE: YOU MUST ADD KARPENTER NODEROLE in AWS AUTH (use EKS Stack to add that)
export class KarpenterStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, buildConfig: BuildSchemaType,
        commonConfig: CommonSchemaType, props: KarpenterStackProps,) {
        super(scope, id, props);
        const namePrefix = `${commonConfig.App}-${buildConfig.Environment}`;
        const cluster = lookUpEksCluster(this, namePrefix);
        const namespace = 'karpenter';
        const serviceAccountName = 'karpenter';
        // if SPOT instances are not going to be used then make it false.
        const interruption = true

        // Create IRSA Role with Service Account and Namespace
        const serviceAccountIrsaRole = createServiceAccountIrsaRole(
            this,
            cluster,
            `${namePrefix}-KarpenterIrsaRole`,
            namespace,
            serviceAccountName,
            [],
            true
        )

        const controllerPolicyDocument = getKarpenterControllerPolicyDocument(this);
        const karpenterIrsaPolicy = new iam.ManagedPolicy(this, 'KarpenterPolicy', {
            managedPolicyName: `${commonConfig.App}-${buildConfig.Environment}-KarpenterPolicy`,
            roles: [serviceAccountIrsaRole],
            document: controllerPolicyDocument,
        });
        // Install Karpenter using Helm
        // Ref: https://github.com/aws/karpenter-provider-aws/tree/release-v0.36.2/charts/karpenter
        const karpenterChart = cluster.addHelmChart('KarpenterHelmChart', {
            chart: 'karpenter',
            repository: 'oci://public.ecr.aws/karpenter/karpenter',
            namespace: namespace,
            release: serviceAccountName,
            version: '0.36.2', // Adjust version as needed
            values: {
                replicas: 1, // Parameterize
                settings:
                {
                    clusterName: cluster.clusterName,
                    clusterEndpoint: cluster.clusterEndpoint,
                    interruptionQueue: interruption ? `${namePrefix}-karpenter-interruption` : ""
                },
                serviceAccount: {
                    create: false,
                    name: "karpenter"
                },
                tolerations: [
                    {
                        key: "CriticalAddonsOnly",
                        operator: "Exists"
                    }
                ],
            },
        });
        karpenterChart.node.addDependency(serviceAccountIrsaRole);

        // Native Interuption Handling
        if (interruption) {
            // Create Interruption Queue
            const queue = new sqs.Queue(cluster.stack, 'karpenter-queue', {
                queueName: `${namePrefix}-karpenter-interruption`,
                retentionPeriod: cdk.Duration.seconds(300),
            });
            queue.addToResourcePolicy(new iam.PolicyStatement({
                sid: 'EC2InterruptionPolicy',
                effect: iam.Effect.ALLOW,
                principals: [
                    new iam.ServicePrincipal('sqs.amazonaws.com'),
                    new iam.ServicePrincipal('events.amazonaws.com'),
                ],
                actions: [
                    "sqs:SendMessage"
                ],
                resources: [`${queue.queueArn}`]
            }));

            // Add Interruption Rules
            new Rule(cluster.stack, 'schedule-change-rule', {
                eventPattern: {
                    source: ["aws.health"],
                    detailType: ['AWS Health Event']
                },
            }).addTarget(new SqsQueue(queue));

            new Rule(cluster.stack, 'spot-interruption-rule', {
                eventPattern: {
                    source: ["aws.ec2"],
                    detailType: ['EC2 Spot Instance Interruption Warning']
                },
            }).addTarget(new SqsQueue(queue));

            new Rule(cluster.stack, 'rebalance-rule', {
                eventPattern: {
                    source: ["aws.ec2"],
                    detailType: ['EC2 Instance Rebalance Recommendation']
                },
            }).addTarget(new SqsQueue(queue));

            new Rule(cluster.stack, 'inst-state-change-rule', {
                eventPattern: {
                    source: ["aws.ec2"],
                    detailType: ['C2 Instance State-change Notification']
                },
            }).addTarget(new SqsQueue(queue));

            // Add policy to the node role to allow access to the Interruption Queue
            const interruptionQueueStatement = new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    "sqs:DeleteMessage",
                    "sqs:GetQueueUrl",
                    "sqs:GetQueueAttributes",
                    "sqs:ReceiveMessage"
                ],
                resources: [`${queue.queueArn}`]
            });
            controllerPolicyDocument.addStatements(interruptionQueueStatement);
        }
    }
}

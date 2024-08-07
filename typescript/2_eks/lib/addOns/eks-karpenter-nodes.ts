import * as cdk from "aws-cdk-lib";
import { KubernetesManifest } from "aws-cdk-lib/aws-eks";
import { lookUpEksCluster } from "../../utils/getEksCluster";
import { CommonStackProps } from "../../utils/constants";

export interface KarpenterNodesStackProps extends CommonStackProps {}
// NOTE: Karpenter Node Role configured in EKS Stack to be used here. (Refer - EKS Stack)
export class KarpenterNodesStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: KarpenterNodesStackProps) {
    super(scope, id, props);
    const namePrefix = `${props.commonConfig.app}-${props.buildConfig.environment}`;
    const cluster = lookUpEksCluster(this, namePrefix);
    // Use the Karpenter NodeRole defined in EKS Stake.
    const defaultEc2NodeClass = {
      apiVersion: "karpenter.k8s.aws/v1beta1",
      kind: "EC2NodeClass",
      metadata: {
        name: "default",
      },
      spec: {
        amiFamily: "AL2",
        subnetSelectorTerms: [
          {
            tags: {
              Name: `${namePrefix}-vpc/vpc/privateSubnet*`,
            },
          },
        ],
        securityGroupSelectorTerms: [
          {
            tags: {
              Name: `eks-cluster-sg-${namePrefix}-*`, // Security Group Created for EKS in Blueprint Stack
            },
          },
        ],
        role: `${namePrefix}-karpenterNodeRole`, // The Role should be in AWS-Auth configmap. See EKS Stack for reference.
        tags: {
          Name: `/eks/${namePrefix}/karpenter/nodepool/default`,
          NodeType: "karpenter-node",
          IntentLabel: "apps",
        },
      },
    };

    const defaultNodePool = {
      apiVersion: "karpenter.sh/v1beta1",
      kind: "NodePool",
      metadata: {
        name: "default",
      },
      spec: {
        template: {
          metadata: {
            labels: {
              intent: "apps", // Label your nodepool as per the workload. (if any)
            },
          },
          spec: {
            nodeClassRef: {
              name: "default",
            },
            requirements: [
              {
                key: "karpenter.sh/capacity-type",
                operator: "In",
                values: ["spot"],
              },
              {
                key: "karpenter.k8s.aws/instance-size",
                operator: "In",
                values: ["medium", "large"], // Keeping it small for sandpit
              },
            ],
          },
        },
        limits: {
          cpu: 1000,
          memory: "1000Gi",
        },

        /*
                // Use Taints if the nodepool is specific to some workload. e.g. Runners\Batch Jobs\
                // Taints may prevent pods from scheduling if they are not tolerated by the pod.
                taints: [{
                    key: "example.com/special-taint",
                    effect: "NoSchedule"
                }],
                */
        disruption: {
          consolidationPolicy: "WhenEmpty",
          consolidateAfter: "30s",
        },
      },
    };
    // Create NodePool and EC2NodeClass.
    new KubernetesManifest(this, "karpenterDefaultNodePoolAndClass", {
      cluster,
      manifest: [defaultEc2NodeClass, defaultNodePool],
    });
  }
}

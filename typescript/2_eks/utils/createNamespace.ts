import * as eks from "aws-cdk-lib/aws-eks";
import { Construct } from "constructs";

/**
 * Creates an IAM role for a Kubernetes service account (IRSA) and optionally creates the service account.
 *
 * @param {Construct} scope - The scope in which to define scope construct.
 * @param {eks.Cluster} cluster - The EKS cluster in which the service account resides.
 * @param {string} namespaceName - The namespace of the Kubernetes service account. If not exists it will create one.
 * @returns {string} namespace name.
 */
export function createNamespace(
  scope: Construct,
  cluster: eks.ICluster,
  namespaceName: string,
) {
  // Create Namespace.
  return new eks.KubernetesManifest(scope, "namespace", {
    cluster,
    manifest: [
      {
        apiVersion: "v1",
        kind: "Namespace",
        metadata: {
          name: namespaceName,
        },
      },
    ],
  });
  // Any other config with namespace goes here
}

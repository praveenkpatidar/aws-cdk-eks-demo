import * as iam from "aws-cdk-lib/aws-iam";
import * as eks from "aws-cdk-lib/aws-eks";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

/**
 * Creates an IAM role for a Kubernetes service account (IRSA) and optionally creates the service account.
 *
 * @param {Construct} scope - The scope in which to define scope construct.
 * @param {eks.Cluster} cluster - The EKS cluster in which the service account resides.
 * @param {string} roleName - The name of the IAM role.
 * @param {string} namespace - The namespace of the Kubernetes service account. If not exists it will create one.
 * @param {string} serviceAccountName - The name of the Kubernetes service account.
 * @param {string[]} awsManagedPolicies - An array of managed policy ARNs to attach to the IAM role.
 * @param {boolean} createServiceAccount - Whether to create the Kubernetes service account.
 * @returns {iam.Role} The created IAM role.
 */
export function createIrsaRoleWithSa(
  scope: Construct,
  cluster: eks.ICluster,
  roleName: string,
  namespaceName: string,
  serviceAccountName: string,
  awsManagedPolicies: string[],
  createServiceAccount: boolean = true,
): iam.Role {
  const conditions = new cdk.CfnJson(scope, "ConditionJson", {
    value: {
      [`${cluster.openIdConnectProvider.openIdConnectProviderIssuer}:aud`]:
        "sts.amazonaws.com",
      [`${cluster.openIdConnectProvider.openIdConnectProviderIssuer}:sub`]: `system:serviceaccount:${namespaceName}:${serviceAccountName}`,
    },
  });
  const principal = new iam.OpenIdConnectPrincipal(
    cluster.openIdConnectProvider,
  ).withConditions({
    StringEquals: conditions,
  });

  const irsaRole = new iam.Role(scope, "irsaRole", {
    roleName: roleName,
    assumedBy: principal,
  });

  // Attach managed policies to the role
  for (const policyArn of awsManagedPolicies) {
    irsaRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(policyArn),
    );
  }
  // Create Service Account.
  if (createServiceAccount) {
    const serviceAccount = new eks.KubernetesManifest(scope, "serviceAccount", {
      cluster,
      manifest: [
        {
          apiVersion: "v1",
          kind: "ServiceAccount",
          metadata: {
            name: serviceAccountName,
            namespace: namespaceName,
            annotations: {
              "eks.amazonaws.com/role-arn": irsaRole.roleArn,
            },
          },
        },
      ],
    });
  }
  return irsaRole;
}

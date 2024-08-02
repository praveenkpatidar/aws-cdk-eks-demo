import { Cluster, OpenIdConnectProvider } from "aws-cdk-lib/aws-eks";
import { Stack } from "aws-cdk-lib";

import * as ssm from "aws-cdk-lib/aws-ssm";

import { KubectlV30Layer } from "@aws-cdk/lambda-layer-kubectl-v30";
import { Construct } from "constructs";

export const lookUpEksCluster = (scope: Construct, clusterName: string) => {
  return Cluster.fromClusterAttributes(scope, `${clusterName}Import`, {
    clusterName: clusterName,
    kubectlRoleArn: `arn:aws:iam::${Stack.of(scope).account}:role/${clusterName}-adminrole`,
    /*
     * The following is required to upgrade if the version of K8s is not compatible.
     */
    kubectlLayer: new KubectlV30Layer(scope, "kubectlLayer"),

    clusterEndpoint: ssm.StringParameter.fromStringParameterAttributes(
      scope,
      "clusterEndpoint",
      {
        parameterName: `${clusterName}-cluster-endpoint`,
        simpleName: true,
      },
    ).stringValue,

    openIdConnectProvider: OpenIdConnectProvider.fromOpenIdConnectProviderArn(
      scope,
      "Provider",
      ssm.StringParameter.fromStringParameterAttributes(scope, "providerArn", {
        parameterName: `${clusterName}-oidc-provider-arn`,
        simpleName: true,
      }).stringValue,
    ),
  });
};

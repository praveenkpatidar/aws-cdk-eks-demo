import * as cdk from "aws-cdk-lib";
import { lookUpEksCluster } from "../../utils/getEksCluster";
import { CommonStackProps, coreTolerations } from "../../utils/constants";
import { createNamespace } from "../../utils/createNamespace";
import { createIrsaRoleWithSa } from "../../utils/createIrsaRoleWithSa";
import {
  Effect,
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement,
} from "aws-cdk-lib/aws-iam";

export interface LoggingStackProps extends CommonStackProps {}

export class LoggingStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: LoggingStackProps) {
    super(scope, id, props);
    const namePrefix = `${props.commonConfig.App}-${props.buildConfig.Environment}`;
    const cluster = lookUpEksCluster(this, namePrefix);
    const namespaceName = "logging";
    const serviceAccountName = "logging";
    const eksConfig = props.buildConfig.Eks;
    // Create Namespace
    const namespace = createNamespace(this, cluster, namespaceName);
    // Create IRSA Role with Service Account
    const serviceAccountIrsaRole = createIrsaRoleWithSa(
      this,
      cluster,
      `${namePrefix}-LoggingIrsaRole`,
      namespaceName,
      serviceAccountName,
      [],
      true,
    );
    serviceAccountIrsaRole.node.addDependency(namespace);

    const loggingIrsaPolicy = new ManagedPolicy(this, "loggingPolicy", {
      managedPolicyName: `${namePrefix}-loggingPolicy`,
      roles: [serviceAccountIrsaRole],
      document: new PolicyDocument({
        statements: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              "logs:CreateLogGroup",
              "logs:CreateLogStream",
              "logs:PutLogEvents",
              "logs:DescribeLogStreams",
            ],
            resources: ["*"],
          }),
        ],
      }),
    });
    const loggingChart = cluster.addHelmChart("loggingHelmChart", {
      chart: "aws-for-fluent-bit",
      repository: "https://aws.github.io/eks-charts",
      namespace: namespaceName,
      release: "aws-for-fluent-bit",
      version: eksConfig.EksAddOns.awsForFluentBit.version, // Adjust version as needed
      values: {
        serviceAccount: {
          create: false,
          name: serviceAccountName,
        },
        tolerations: [coreTolerations], // keeping this as essential service
        cloudWatch: {
          enabled: true,
          logGroupName: `/aws/eks/${namePrefix}/fluent-bit-logs`,
          region: props.commonConfig.AWSRegion,
        },
      },
    });
    loggingChart.node.addDependency(serviceAccountIrsaRole);
  }
}

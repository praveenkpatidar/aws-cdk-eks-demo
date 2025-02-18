#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import {
  BuildSchemaType,
  CommonSchemaType,
  buildSchema,
  commonSchema,
  loadConfig,
} from "../../0_common-config";
import { EksStack } from "../lib/eks-stack";
import { KarpenterStack } from "../lib/Addons/eks-karpenter-controller";
import { KarpenterNodesStack } from "../lib/Addons/eks-karpenter-nodes";
import { LoggingStack } from "../lib/Addons/eks-logging";
import { MonitoringStack } from "../lib/Addons/eks-monitoring";
import { EfsStack } from "../lib/Addons/eks-efs"; // Import the EFS stack

const app = new cdk.App();
const envName = app.node.tryGetContext("envName");
if (!envName) {
  throw new Error(`Could not find environment Variable envName s`);
}
const buildConfig: BuildSchemaType = loadConfig(envName, buildSchema);
const commonConfig: CommonSchemaType = loadConfig("common", commonSchema);

const nameTag = `${commonConfig.app}-${envName}`;

const config = {
  buildConfig,
  commonConfig,
  env: {
    region: commonConfig.awsRegion,
    account: buildConfig.awsAccountID,
  },
};
// Deploy the EFS Stack
const efsStack = new EfsStack(app, `${nameTag}-efs`, config);

// Main EKS Stack
const eksStack = new EksStack(app, `${nameTag}-eks`, config);
eksStack.node.addDependency(efsStack);


// Karpenter Controller Stack
const karpenterStack = new KarpenterStack(
  app,
  `${nameTag}-karpenter-controller`,
  config,
);
karpenterStack.node.addDependency(eksStack);

// Karpenter Nodes
const karpenterNodeStack = new KarpenterNodesStack(
  app,
  `${nameTag}-karpenter-nodes`,
  config,
);
karpenterNodeStack.node.addDependency(eksStack);
karpenterNodeStack.node.addDependency(karpenterStack);

// Logging Stack
const loggingNodeStack = new LoggingStack(app, `${nameTag}-logging`, config);
loggingNodeStack.node.addDependency(eksStack);

// Monitoring Stack
const monitoringNodeStack = new MonitoringStack(
  app,
  `${nameTag}-monitoring`,
  config,
);
monitoringNodeStack.node.addDependency(eksStack);
monitoringNodeStack.node.addDependency(efsStack);

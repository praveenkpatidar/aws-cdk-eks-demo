#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {
    BuildSchemaType,
    CommonSchemaType,
    buildSchema,
    commonSchema,
    loadConfig,
} from "../../0_common-config";
import { EksStack } from '../lib/eks-stack';
//import { LoadBalancerControllerStack } from '../lib/addOns/eks-lb-controller';
//import { PrometheusKubeStack } from '../lib/addOns/eks-prom-stack';
import { KarpenterStack } from '../lib/addOns/eks-karpenter-stack';
import { KarpenterNodesStack } from '../lib/addOns/eks-karpenter-nodes';


const app = new cdk.App();
const envName = app.node.tryGetContext("envName");
if (!envName) {
    throw new Error(`Could not find environment Variable envName s`);
}
const buildConfig: BuildSchemaType = loadConfig(envName, buildSchema);
const commonConfig: CommonSchemaType = loadConfig("common", commonSchema);

let nameTag = `${commonConfig.App}-${envName}`;
let awsEnv = {
    env: {
        region: commonConfig.AWSRegion,
        account: buildConfig.AWSAccountID,
    }
}

const eksStack = new EksStack(app, `${nameTag}-eks`, buildConfig, commonConfig, awsEnv);
// Add Prometheus Kube Stack

const karpenterStack = new KarpenterStack(app, `${nameTag}-eks-karpenter`, buildConfig, commonConfig, awsEnv);
karpenterStack.node.addDependency(eksStack);

const karpenterNodeStack = new KarpenterNodesStack(app, `${nameTag}-eks-karpenter-nodes`, buildConfig, commonConfig, awsEnv);
karpenterNodeStack.node.addDependency(eksStack);
karpenterNodeStack.node.addDependency(karpenterStack);

#!/usr/bin/env node
import {
    BuildSchemaType,
    CommonSchemaType,
    buildSchema,
    commonSchema,
    loadConfig,
} from "../../0_common-config";
import * as cdk from "aws-cdk-lib";
import { VpcStack } from "../lib/vpc-stack";

const app = new cdk.App();
const envName = app.node.tryGetContext("envName");
if (!envName) {
    throw new Error(`Could not find environment Variable envName s`);
}
const buildConfig: BuildSchemaType = loadConfig(envName, buildSchema);
const commonConfig: CommonSchemaType = loadConfig("common", commonSchema);

let stackName = commonConfig.App + "-" + envName + "-vpc";
console.log(stackName);
const vpcStack = new VpcStack(app, stackName, buildConfig, commonConfig, {
    env: {
        region: commonConfig.AWSRegion,
        account: buildConfig.AWSAccountID,
    },
});

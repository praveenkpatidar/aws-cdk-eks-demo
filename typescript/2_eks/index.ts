#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EksStack } from './lib/eks-stack';
import { BuildConfig } from "./lib/build-config";
import Utils from './lib/utils'
const app = new cdk.App();


let buildConfig: BuildConfig = Utils.getConfig(app);
let stackName = buildConfig.App + "-" + buildConfig.Environment;
const account = buildConfig.AWSAccountID;
const region = buildConfig.AWSProfileRegion;
const env = { region: region, account: account }
new EksStack(app, stackName, buildConfig, { env });

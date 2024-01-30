#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EksStack } from './lib/eks-stack';
import { BuildConfig } from "./lib/build-config";
import Utils from './lib/utils'
const app = new cdk.App();

function Main() {
  let buildConfig: BuildConfig = Utils.getConfig(app);
  let stackName = buildConfig.App + "-" + buildConfig.Environment + "-main";
  const eksStack = new EksStack(app, stackName, buildConfig,
    {
      env:
      {
        region: buildConfig.AWSProfileRegion,
        account: buildConfig.AWSAccountID
      }
    });
  app.synth();
}
Main();

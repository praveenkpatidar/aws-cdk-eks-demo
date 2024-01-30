#!/usr/bin/env node
import { BuildConfig } from "./lib/build-config";
import Utils from './lib/utils'
import * as cdk from 'aws-cdk-lib';
import { VpcStack } from './lib/vpc-stack';



const app = new cdk.App();

function Main() {
    let buildConfig: BuildConfig = Utils.getConfig(app);
    let stackName = buildConfig.App + "-" + buildConfig.Environment + "-vpc";
    const vpcStack = new VpcStack(app, stackName, buildConfig,
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

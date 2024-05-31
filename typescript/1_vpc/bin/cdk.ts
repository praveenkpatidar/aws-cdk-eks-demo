#!/usr/bin/env node
import { loadConfig } from '../../0_common_config/lib/utils';
import { Config } from '../../0_common_config/lib/config';
import * as cdk from 'aws-cdk-lib';
import { VpcStack } from '../lib/vpc-stack';

const app = new cdk.App();
const env = app.node.tryGetContext('env')
function Main() {
    const config: Config = loadConfig(env);
    let stackName = config.App + "-" + config.Environment + "-vpc";
    const vpcStack = new VpcStack(app, stackName, config,
        {
            env:
            {
                region: config.AWSProfileRegion,
                account: config.AWSAccountID
            }
        });
    app.synth();
}
Main();

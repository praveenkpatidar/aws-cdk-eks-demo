#!/usr/bin/env node
import { BuildConfig } from "./lib/build-config";
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VpcStack } from './lib/vpc-stack';
import * as fs from 'fs';
import * as path from "path";
const yaml = require('js-yaml');

const app = new cdk.App();

function ensureString(commonProps: { [name: string]: any }, envProps: { [name: string]: any },propName: string ): string
{
    if( envProps[propName] && envProps[propName].trim().length > 0)
    {
      return envProps[propName];
    }
    if (commonProps[propName] && commonProps[propName].trim().length > 0)
    {
      return commonProps[propName];
    }
    throw new Error(propName+ ": Property Value not found in common or environment config");
}

function getConfig()
{
    let env = app.node.tryGetContext('config');
    if (!env)
        throw new Error("Context variable missing on CDK command. Pass in as `-c config=XXX`");

    let commonProps = yaml.load(fs.readFileSync(path.resolve("../../typescript/0_common_config/common.yaml"), "utf8"));
    let envProps = yaml.load(fs.readFileSync(path.resolve("../../typescript/0_common_config/"+env+".yaml"), "utf8"));


    let buildConfig: BuildConfig = {
        AWSAccountID: ensureString(commonProps,envProps, 'AWSAccountID'),
        AWSProfileName: ensureString(commonProps,envProps, 'AWSProfileName'),
        AWSProfileRegion: ensureString(commonProps,envProps, 'AWSProfileRegion'),
        Project: ensureString(commonProps,envProps, 'Project'),
        App: ensureString(commonProps,envProps, 'App'),
        Version: ensureString(commonProps,envProps, 'Version'),
        Environment: ensureString(commonProps,envProps, 'Environment'),
        Networking: {
            VPCCidr: ensureString(commonProps['Networking'],envProps['Networking'], 'VPCCidr')
        }
    };

    return buildConfig;
}


let buildConfig: BuildConfig = getConfig();
let stackName = buildConfig.App + "-" + buildConfig.Environment + "-vpc";
const vpcStack = new VpcStack(app, stackName,buildConfig,
    {
        env:
            {
                region: buildConfig.AWSProfileRegion,
                account: buildConfig.AWSAccountID
            }
    });
app.synth();

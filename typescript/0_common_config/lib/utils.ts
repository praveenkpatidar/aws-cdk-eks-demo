import { BuildConfig } from './build-config';
import * as cdk from 'aws-cdk-lib';
import * as fs from 'fs';
import * as path from "path";
const yaml = require('js-yaml');
const common_config_path = '../../typescript/0_common_config/'
export default class Utils {
    static ensureString(commonProps: { [name: string]: any }, envProps: { [name: string]: any }, propName: string): string {
        if (envProps[propName] && envProps[propName].length > 0) {
            return envProps[propName];
        }
        if (commonProps[propName] && commonProps[propName].length > 0) {
            return commonProps[propName];
        }
        throw new Error(propName + ": Property Value not found in common or environment config");
    }

    static booleanify(value: string): boolean {
        const truthy: string[] = [
            'true',
            'True',
            '1'
        ]

        return truthy.includes(value)
    }

    static getConfig(app: cdk.App) {
        let env = app.node.tryGetContext('config');
        if (!env)
            throw new Error("Context variable missing on CDK command. Pass in as `-c config=XXX`");
        let commonProps = yaml.load(fs.readFileSync(path.resolve(common_config_path + "common.yaml"), "utf8"))
        let envProps = yaml.load(fs.readFileSync(path.resolve(common_config_path + "" + env + ".yaml"), "utf8"));

        let buildConfig: BuildConfig = {
            AWSAccountID: this.ensureString(commonProps, envProps, 'AWSAccountID'),
            AWSProfileName: this.ensureString(commonProps, envProps, 'AWSProfileName'),
            AWSProfileRegion: this.ensureString(commonProps, envProps, 'AWSProfileRegion'),
            Project: this.ensureString(commonProps, envProps, 'Project'),
            App: this.ensureString(commonProps, envProps, 'App'),
            Version: this.ensureString(commonProps, envProps, 'Version'),
            Environment: this.ensureString(commonProps, envProps, 'Environment'),
            Networking: {
                VPCCidr: this.ensureString(commonProps['Networking'], envProps['Networking'], 'VPCCidr'),
                EKSTags: this.booleanify(this.ensureString(commonProps['Networking'], envProps['Networking'], 'EKSTags'))
            }
        };
        return buildConfig;
    }
}

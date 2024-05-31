import { BuildConfig } from './build-config';
import * as cdk from 'aws-cdk-lib';
import * as fs from 'fs';
import * as path from "path";
const yaml = require('js-yaml');
const common_config_path = '../../typescript/0_common_config/'
export default class Utils {
    static getBuildConfig(app: cdk.App) {
        let env = app.node.tryGetContext('config');
        if (!env)
            throw new Error("Context variable missing on CDK command. Pass in as `-c config=XXX`");
        let commonProps = yaml.load(fs.readFileSync(path.resolve(common_config_path + "common.yaml"), "utf8"))
        let buildConfig = yaml.load(fs.readFileSync(path.resolve(common_config_path + "" + env + ".yaml"), "utf8")) as BuildConfig;
        return buildConfig;
    }
    
    static getCommonConfig(app: cdk.App) {
        let env = app.node.tryGetContext('config');
        if (!env)
            throw new Error("Context variable missing on CDK command. Pass in as `-c config=XXX`");
        let commonProps = yaml.load(fs.readFileSync(path.resolve(common_config_path + "common.yaml"), "utf8"))
        let buildConfig = yaml.load(fs.readFileSync(path.resolve(common_config_path + "" + env + ".yaml"), "utf8")) as BuildConfig;
        return buildConfig;
    }
    
}

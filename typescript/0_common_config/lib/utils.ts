import * as fs from 'fs';
import * as yaml from 'yaml';
import * as path from 'path';
import { Config } from './config';

const loadConfig = (env: string): Config => {
    // Load common configuration
    const commonConfigPath = path.resolve(__dirname, '../configs/common.yaml');
    const commonConfigFile = fs.readFileSync(commonConfigPath, 'utf8');
    const commonConfig = yaml.parse(commonConfigFile) as Config;

    // Load environment-specific configuration
    const envConfigPath = path.resolve(__dirname, `../configs/${env}.yaml`);
    const envConfigFile = fs.readFileSync(envConfigPath, 'utf8');
    const envConfig = yaml.parse(envConfigFile) as Partial<Config>;

    // Merge configurations
    const config: Config = {
        ...commonConfig,
        ...envConfig,
        Eks: {
            ...commonConfig.Eks,
            ...envConfig.Eks,
        },
        Networking: {
            ...commonConfig.Networking,
            ...envConfig.Networking,
        },
    };

    return config;
};
// Export the configuration
export { loadConfig }

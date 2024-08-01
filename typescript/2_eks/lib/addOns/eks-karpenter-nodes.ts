import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import {
    BuildSchemaType,
    CommonSchemaType,
} from "../../../0_common-config/lib/schema";
import { lookUpEksCluster } from '../../utils/getEksCluster';

export interface KarpenterNodesStackProps extends cdk.StackProps {
}

export class KarpenterNodesStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, buildConfig: BuildSchemaType,
        commonConfig: CommonSchemaType, props: KarpenterNodesStackProps,) {
        super(scope, id, props);
        const namePrefix = `${commonConfig.App}-${buildConfig.Environment}`;
        // Use the Karpenter NodeRole defined in EKS Stake.

    }
}

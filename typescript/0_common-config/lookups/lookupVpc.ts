import { Vpc } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

export const lookupVpc = (scope: Construct, logicalId: string, vpcName: string) => {
    return Vpc.fromLookup(scope, logicalId, {
        isDefault: false,
        vpcName: vpcName,
    });
};

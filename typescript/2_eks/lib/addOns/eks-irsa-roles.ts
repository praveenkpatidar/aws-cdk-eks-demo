import * as cdk from 'aws-cdk-lib';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface IrsaRoleStackProps extends cdk.StackProps {
    cluster: eks.Cluster;
    roleName: string;
    serviceAccountName: string;
    policyStatements?: iam.PolicyStatement[];
    managedPolicyNames?: string[];
}

export class IrsaRoleStack extends cdk.Stack {
    public readonly irsaRole: iam.Role;
    constructor(scope: cdk.App, id: string, props: IrsaRoleStackProps) {
        super(scope, id, props);

        const { cluster, roleName, serviceAccountName, policyStatements, managedPolicyNames } = props;
        // Create a Kubernetes service account for IrsaRole
        const IrsaRoleServiceAccount = cluster.addServiceAccount('IrsaRoleServiceAccount', {
            name: roleName,
            namespace: serviceAccountName
        });

        this.irsaRole = IrsaRoleServiceAccount.role as iam.Role;

        const IrsaRolePolicy = new iam.ManagedPolicy(this, 'IrsaRolePolicy', {
            managedPolicyName: `${roleName}-IrsaRolePolicy`,
            statements: policyStatements,
        });
        IrsaRolePolicy.node.addDependency(IrsaRoleServiceAccount);

        IrsaRoleServiceAccount.role.addManagedPolicy(
            iam.ManagedPolicy.fromAwsManagedPolicyName(IrsaRolePolicy.managedPolicyName)
        );
        managedPolicyNames?.forEach((policyName) => {
            IrsaRoleServiceAccount.role.addManagedPolicy(
                iam.ManagedPolicy.fromAwsManagedPolicyName(policyName)
            );
        });

    }
}

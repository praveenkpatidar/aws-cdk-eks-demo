import * as  ec2 from 'aws-cdk-lib/aws-ec2';
import * as  eks from 'aws-cdk-lib/aws-eks';
import * as  iam from 'aws-cdk-lib/aws-iam';
import { BuildConfig } from './build-config';
import { Construct } from 'constructs';
import { Stack, StackProps, Tags } from 'aws-cdk-lib';

declare const cluster: eks.Cluster;
declare const instanceType: ec2.InstanceType;
declare const role: iam.Role;
declare const securityGroup: ec2.SecurityGroup;
declare const subnet: ec2.Subnet;
declare const subnetFilter: ec2.SubnetFilter;

export class ManagedNodeGroup extends Stack {
    constructor(scope: Construct, id: string, buildConfig: BuildConfig, props?: StackProps,) {
        super(scope, id, props);
        const nodeGroup = new eks.Nodegroup(scope, 'MyNodegroup', {
            cluster: cluster,
            // the properties below are optional
            amiType: eks.NodegroupAmiType.AL2_X86_64,
            capacityType: eks.CapacityType.SPOT,
            desiredSize: 100,
            diskSize: 100,
            forceUpdate: false,
            instanceTypes: [instanceType],
            labels: {
                labelsKey: 'labels',
            },
            launchTemplateSpec: {
                id: 'id',

                // the properties below are optional
                version: 'version',
            },
            maxSize: 123,
            minSize: 123,
            nodegroupName: 'nodegroupName',
            nodeRole: role,
            releaseVersion: 'releaseVersion',
            subnets: {
                availabilityZones: ['availabilityZones'],
                onePerAz: false,
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            },
            tags: {
                tagsKey: 'tags',
            },
            taints: [{
                effect: eks.TaintEffect.NO_SCHEDULE,
                key: 'key',
                value: 'value',
            }],
        });

    }
}

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BuildConfig } from './build-config';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { KubernetesVersion, Nodegroup, NodegroupAmiType, TaintEffect } from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as eks from 'aws-cdk-lib/aws-eks';
import { Karpenter } from 'cdk-eks-karpenter';

export class EksExtStack extends cdk.Stack {
  constructor(scope: Construct, id: string, buildConfig: BuildConfig, props?: cdk.StackProps,) {
    super(scope, id, props);
    const nameTag = buildConfig.App + "-" + buildConfig.Environment

    const eksCluster = eks.Cluster.fromClusterAttributes(this, nameTag + "-cluster", {
      clusterName: nameTag + "-cluster"
    })
    console.log("Endpoint " + eksCluster.clusterSecurityGroupId)
    /*const karpenter = new Karpenter(this, nameTag + "-cluster-karpenter", {
      cluster: eksCluster,
      version: 'v0.32.0',
    })
    */
  }
}

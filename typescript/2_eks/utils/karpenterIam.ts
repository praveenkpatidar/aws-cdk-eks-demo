import { Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { PolicyDocument } from 'aws-cdk-lib/aws-iam';
// Ref https://github.com/aws-quickstart/cdk-eks-blueprints/blob/main/lib/addons/karpenter/iam.ts
// IAM Policy for Beta CRD Karpenter addons
export const getKarpenterControllerPolicyDocument = (scope: Construct) => {
    return PolicyDocument.fromJson({
        "Version": "2012-10-17",
        "Statement": [
            {   // Additional Policy to Pass role fix error
                "Sid": "AllowPassingInstanceRole",
                "Effect": "Allow",
                "Resource": `arn:aws:iam::${Stack.of(scope).account}:role/*karpenterNodeRole`,
                "Action": "iam:PassRole",
                "Condition": {
                    "StringEquals": {
                        "iam:PassedToService": "ec2.amazonaws.com"
                    }
                }
            },
            {
                "Sid": "AllowScopedEC2InstanceActions",
                "Effect": "Allow",
                "Resource": [
                    `arn:aws:ec2:${Stack.of(scope).region}::image/*`,
                    `arn:aws:ec2:${Stack.of(scope).region}::snapshot/*`,
                    `arn:aws:ec2:${Stack.of(scope).region}:*:spot-instances-request/*`,
                    `arn:aws:ec2:${Stack.of(scope).region}:*:security-group/*`,
                    `arn:aws:ec2:${Stack.of(scope).region}:*:subnet/*`,
                    `arn:aws:ec2:${Stack.of(scope).region}:*:launch-template/*`
                ],
                "Action": [
                    "ec2:RunInstances",
                    "ec2:CreateFleet"
                ]
            },
            {
                "Sid": "AllowScopedEC2InstanceActionsWithTags",
                "Effect": "Allow",
                "Resource": [
                    `arn:aws:ec2:${Stack.of(scope).region}:*:fleet/*`,
                    `arn:aws:ec2:${Stack.of(scope).region}:*:instance/*`,
                    `arn:aws:ec2:${Stack.of(scope).region}:*:volume/*`,
                    `arn:aws:ec2:${Stack.of(scope).region}:*:network-interface/*`,
                    `arn:aws:ec2:${Stack.of(scope).region}:*:launch-template/*`,
                    `arn:aws:ec2:${Stack.of(scope).region}:*:spot-instances-request/*`
                ],
                "Action": [
                    "ec2:RunInstances",
                    "ec2:CreateFleet",
                    "ec2:CreateLaunchTemplate"
                ],
                "Condition": {
                    "StringLike": {
                        "aws:RequestTag/karpenter.sh/nodepool": "*"
                    }
                },
            },
            {
                "Sid": "AllowScopedResourceCreationTagging",
                "Effect": "Allow",
                "Resource": [
                    `arn:aws:ec2:${Stack.of(scope).region}:*:fleet/*`,
                    `arn:aws:ec2:${Stack.of(scope).region}:*:instance/*`,
                    `arn:aws:ec2:${Stack.of(scope).region}:*:volume/*`,
                    `arn:aws:ec2:${Stack.of(scope).region}:*:network-interface/*`,
                    `arn:aws:ec2:${Stack.of(scope).region}:*:launch-template/*`,
                    `arn:aws:ec2:${Stack.of(scope).region}:*:spot-instances-request/*`
                ],
                "Action": "ec2:CreateTags",
                "Condition": {
                    "StringLike": {
                        "aws:RequestTag/karpenter.sh/nodepool": "*"
                    }
                }
            },
            {
                "Sid": "AllowScopedResourceTagging",
                "Effect": "Allow",
                "Resource": `arn:aws:ec2:${Stack.of(scope).region}:*:instance/*`,
                "Action": "ec2:CreateTags",
                "Condition": {
                    "StringLike": {
                        "aws:ResourceTag/karpenter.sh/nodepool": "*"
                    },
                    "ForAllValues:StringEquals": {
                        "aws:TagKeys": [
                            "karpenter.sh/nodeclaim",
                            "Name"
                        ]
                    }
                }
            },
            {
                "Sid": "AllowScopedDeletion",
                "Effect": "Allow",
                "Resource": [
                    `arn:aws:ec2:${Stack.of(scope).region}:*:instance/*`,
                    `arn:aws:ec2:${Stack.of(scope).region}:*:launch-template/*`
                ],
                "Action": [
                    "ec2:TerminateInstances",
                    "ec2:DeleteLaunchTemplate"
                ],
                "Condition": {
                    "StringLike": {
                        "aws:ResourceTag/karpenter.sh/nodepool": "*"
                    }
                }
            },
            {
                "Sid": "AllowRegionalReadActions",
                "Effect": "Allow",
                "Resource": "*",
                "Action": [
                    "ec2:DescribeAvailabilityZones",
                    "ec2:DescribeImages",
                    "ec2:DescribeInstances",
                    "ec2:DescribeInstanceTypeOfferings",
                    "ec2:DescribeInstanceTypes",
                    "ec2:DescribeLaunchTemplates",
                    "ec2:DescribeSecurityGroups",
                    "ec2:DescribeSpotPriceHistory",
                    "ec2:DescribeSubnets"
                ],
                "Condition": {
                    "StringEquals": {
                        "aws:RequestedRegion": `${Stack.of(scope).region}`
                    }
                }
            },
            {
                "Sid": "AllowSSMReadActions",
                "Effect": "Allow",
                "Resource": `arn:aws:ssm:${Stack.of(scope).region}::parameter/aws/service/*`,
                "Action": "ssm:GetParameter"
            },
            {
                "Sid": "AllowPricingReadActions",
                "Effect": "Allow",
                "Resource": "*",
                "Action": "pricing:GetProducts"
            },
            {
                "Sid": "AllowScopedInstanceProfileCreationActions",
                "Effect": "Allow",
                "Resource": "*",
                "Action": [
                    "iam:CreateInstanceProfile"
                ],
                "Condition": {
                    "StringLike": {
                        "aws:RequestTag/karpenter.k8s.aws/ec2nodeclass": "*"
                    }
                }
            },
            {
                "Sid": "AllowScopedInstanceProfileTagActions",
                "Effect": "Allow",
                "Resource": "*",
                "Action": [
                    "iam:TagInstanceProfile"
                ],
                "Condition": {
                    "StringLike": {
                        "aws:ResourceTag/karpenter.k8s.aws/ec2nodeclass": "*",
                        "aws:RequestTag/karpenter.k8s.aws/ec2nodeclass": "*"
                    }
                }
            },
            {
                "Sid": "AllowScopedInstanceProfileActions",
                "Effect": "Allow",
                "Resource": "*",
                "Action": [
                    "iam:AddRoleToInstanceProfile",
                    "iam:RemoveRoleFromInstanceProfile",
                    "iam:DeleteInstanceProfile"
                ],
                "Condition": {
                    "StringLike": {
                        "aws:ResourceTag/karpenter.k8s.aws/ec2nodeclass": "*"
                    }
                }
            },
            {
                "Sid": "AllowInstanceProfileReadActions",
                "Effect": "Allow",
                "Resource": "*",
                "Action": "iam:GetInstanceProfile"
            },
            {
                "Sid": "AllowAPIServerEndpointDiscovery",
                "Effect": "Allow",
                "Resource": "*",
                "Action": "eks:DescribeCluster"
            }
        ]
    });
};

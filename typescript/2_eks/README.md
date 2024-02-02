# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template

# Sample commands
aws sso login --profile sandpit2
cdk deploy -c config=dev --profile=sandpit2 --all

If master Role is working then use below command to kube config or use stack output.

aws eks update-kubeconfig --name eks-cdk-demo-devcluster --region ap-southeast-2  --profile sandpit2

// import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export interface VpcProps {
  // Define construct properties here
}

export class Vpc extends Construct {

  constructor(scope: Construct, id: string, props: VpcProps = {}) {
    super(scope, id);

    // Define construct contents here

    // example resource
    // const queue = new sqs.Queue(this, 'VpcQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
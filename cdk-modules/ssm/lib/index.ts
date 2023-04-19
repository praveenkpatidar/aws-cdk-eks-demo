// import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';

export interface SsmProps {
  readonly name: string;
  readonly value: string;
  readonly secureString: boolean;
  readonly tier?: ssm.ParameterTier;
}

export class SsmParameter extends Construct {

  constructor(scope: Construct, id: string, _props: SsmProps = {
    name: '',
    value: '',
    secureString: false,
    tier: ssm.ParameterTier.STANDARD
  }) {
    super(scope, id);
    const stringValue = new ssm.StringParameter(this, "ssmparam-" + _props.name, {
      allowedPattern: '.*',
      description: "SSM Parameter Created from the CDK " + _props.name,
      parameterName: _props.name,
      stringValue: _props.value,
      tier: _props.tier
    });
  }
}

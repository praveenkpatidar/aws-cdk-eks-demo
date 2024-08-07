import { StackProps } from "aws-cdk-lib";
import {
  BuildSchemaType,
  CommonSchemaType,
} from "../../0_common-config/lib/schema";

export interface CommonStackProps extends StackProps {
  buildConfig: BuildSchemaType;
  commonConfig: CommonSchemaType;
}

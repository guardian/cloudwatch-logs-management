import 'source-map-support/register';
import type { StageSynthesisOptions } from 'aws-cdk-lib';
import { App } from 'aws-cdk-lib';
import type { CloudAssembly } from 'aws-cdk-lib/cx-api';
import type { CloudwatchLogsManagementProps } from '../lib/cloudwatch-logs-management';
import { CloudwatchLogsManagement } from '../lib/cloudwatch-logs-management';
import { RiffRaffYamlFile } from '../lib/riff-raff-yaml';

class AppWithRiffRaffYamlGenerator extends App {
	override synth(options?: StageSynthesisOptions): CloudAssembly {
		new RiffRaffYamlFile(this).synth();
		return super.synth(options);
	}
}

const app = new AppWithRiffRaffYamlGenerator();

export const stacks: CloudwatchLogsManagementProps[] = [
	{
		stack: 'deploy',
		cloudFormationStackName: 'deploy-PROD-cloudwatch-logs-management',
	},
];

stacks.forEach((stack) => new CloudwatchLogsManagement(app, stack));

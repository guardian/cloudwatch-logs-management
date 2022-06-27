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
	{ stack: 'deploy' },
	{ stack: 'flexible' },
	{ stack: 'workflow' },
	{ stack: 'media-service' },
	{ stack: 'content-api' },
	{ stack: 'cms-fronts' },
	{ stack: 'ophan' },
	{ stack: 'frontend' },
	{ stack: 'identity' },
	{ stack: 'mobile' },
	{
		stack: 'targeting',
		logShippingPrefixes: [
			'/aws/lambda/diff-checker-PROD',
			'/aws/lambda/diff-publisher-PROD',
			'/aws/lambda/braze-exporter-trigger-PROD',
			'/aws/lambda/braze-exporter-callback-PROD',
		],
	},
	{
		stack: 'pfi',
		logShippingPrefixes: [
			'/aws/lambda/lurch',
			'/aws/rds/instance/lurch',
			'/aws/lambda/pfi-lurch',
			'fb-ad-library',
			'lurch',
		],
	},
];

stacks.forEach((stack) => new CloudwatchLogsManagement(app, stack));

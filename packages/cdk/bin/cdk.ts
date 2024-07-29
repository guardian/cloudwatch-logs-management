import 'source-map-support/register';
import { GuRoot } from "@guardian/cdk/lib/constructs/root";
import type { CloudwatchLogsManagementProps } from '../lib/cloudwatch-logs-management';
import { CloudwatchLogsManagement } from '../lib/cloudwatch-logs-management';

const app = new GuRoot();

export const stacks: CloudwatchLogsManagementProps[] = [
	{ stack: 'print-production' },
	{ stack: 'deploy' },
	{ stack: 'flexible' },
	{ stack: 'workflow' },
	{ stack: 'media-service',
		logShippingPrefixes: [
			'/aws/lambda',
			'/aws/transfer'
		],
	},
	{ stack: 'content-api' },
	{ stack: 'cms-fronts' },
	{ stack: 'ophan' },
	{ stack: 'frontend' },
	{ stack: 'identity' },
	{ stack: 'interactives' },
	{ stack: 'mobile' },
	{ stack: 'security' },
	{ stack: 'personalisation' },
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
			'/aws/lambda/transcription-service',
		],
	},
	{
		stack: 'playground',
		containsPIIData: true,
	},
	{ stack: 'ai' },
	{
		stack: 'membership',
		retentionInDays: 14,
		containsPIIData: true,
	}
];

stacks.forEach((stack) => new CloudwatchLogsManagement(app, stack));

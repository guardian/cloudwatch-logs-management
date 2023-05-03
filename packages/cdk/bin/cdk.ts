import 'source-map-support/register';
import { GuRootExperimental } from '@guardian/cdk/lib/experimental/constructs/root';
import type { CloudwatchLogsManagementProps } from '../lib/cloudwatch-logs-management';
import { CloudwatchLogsManagement } from '../lib/cloudwatch-logs-management';

const app = new GuRootExperimental();

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
	{ stack: 'security' },
	{
		stack: 'targeting',
		logShippingPrefixes: [
			'/aws/lambda/diff-checker',
			'/aws/lambda/diff-publisher',
			'/aws/lambda/braze-exporter-trigger',
			'/aws/lambda/braze-exporter-callback',
			'/aws/lambda/braze-exporter-progress',
			'/aws/lambda/braze-exporter-bigquery-ingest',
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

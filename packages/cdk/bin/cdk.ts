import 'source-map-support/register';
import { GuRoot } from "@guardian/cdk/lib/constructs/root";
import type { CloudwatchLogsManagementProps } from "../lib/cloudwatch-logs-management-props";
import {CloudwatchLogsManagementRetention} from "../lib/cloudwatch-logs-management-retention";
import {CloudwatchLogsManagementTransfer} from "../lib/cloudwatch-logs-management-transfer";

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
		retentionInDays: 14,
	},
	{ stack: 'ai' }
];

// For stacks that contain PII data in their logs, these logs cannot be moved from AWS to a 3rd party.
// It is better to not create the transfer resources at all in these stacks.
export const retentionOnlyStacks: CloudwatchLogsManagementProps[] = [
	{
		stack: 'membership',
		retentionInDays: 14,
	}
];

export const retentionStacks: CloudwatchLogsManagementProps[] = stacks.concat(retentionOnlyStacks);

retentionStacks.forEach((stack) => new CloudwatchLogsManagementRetention(app, stack));
stacks.forEach((stack) => new CloudwatchLogsManagementTransfer(app, stack));

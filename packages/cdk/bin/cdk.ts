import 'source-map-support/register';
import { GuRoot } from "@guardian/cdk/lib/constructs/root";
import { CloudwatchLogsManagement } from '../lib/cloudwatch-logs-management';
import {CloudwatchLogsRetention} from "../lib/cloudwatch-logs-retention";
import {GuStackProps} from "@guardian/cdk/lib/constructs/core";

const app = new GuRoot();

export interface CloudwatchLogsManagementProps
	extends Omit<GuStackProps, 'stage' | 'env'> {
	retentionInDays?: number;
	logShippingPrefixes?: string[];
}

export const retentionOnlyStacks: CloudwatchLogsManagementProps[] = [
	{
		stack: 'membership',
		retentionInDays: 14,
	}
];

export const retentionAndTransferStacks: CloudwatchLogsManagementProps[] = [
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
	{ stack: 'playground' },
	{ stack: 'ai' },
];

export const allRetentionStacks = retentionOnlyStacks.concat(retentionAndTransferStacks);

allRetentionStacks.forEach((stack) => { new CloudwatchLogsRetention(app, stack)});

retentionAndTransferStacks.forEach((stack) => { new CloudwatchLogsManagement(app, stack)});


import 'source-map-support/register';
import { GuRoot } from "@guardian/cdk/lib/constructs/root";
import { CloudwatchLogsManagement } from '../lib/cloudwatch-logs-management';
import type {CloudwatchLogsManagementProps} from "../lib/cloudwatch-logs-management-props";
import {CloudwatchLogsRetention} from "../lib/cloudwatch-logs-retention";

const app = new GuRoot();

// The word "stack" in this file refers to the deployment-resources-stacks in riffraff. These stacks map roughly to aws accounts.

// Adding stacks here will manage log retention without transfer of logs to the ELK stack.
// This is mainly for stacks whose logs contain PII data.
export const retentionOnlyStacks: CloudwatchLogsManagementProps[] = [
	{
		stack: 'membership',
		retentionInDays: 14,
	}
];

export const retentionAndTransferStacks: CloudwatchLogsManagementProps[] = [
	{ stack: 'print-production' },
	{ stack: 'editorial-feeds' },
	{ stack: 'deploy' },
	{ stack: 'feast' },
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
			'transcription-service'
		],
	},
	{ stack: 'playground' },
	{ stack: 'ai' },
	{ stack: 'hiring-and-onboarding' },
];

export const allRetentionStacks = retentionOnlyStacks.concat(retentionAndTransferStacks);

allRetentionStacks.forEach((stack) => { new CloudwatchLogsRetention(app, stack)});

retentionAndTransferStacks.forEach((stack) => { new CloudwatchLogsManagement(app, stack)});


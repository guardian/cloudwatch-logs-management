import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import type { CloudwatchLogsManagementProps } from '../lib/cloudwatch-logs-management';
import { CloudwatchLogsManagement } from '../lib/cloudwatch-logs-management';

const app = new App();

const stacks: CloudwatchLogsManagementProps[] = [
	{
		stack: 'deploy',
		cloudFormationStackName: 'deploy-PROD-cloudwatch-logs-management',
	},
];

stacks.forEach((stack) => new CloudwatchLogsManagement(app, stack));

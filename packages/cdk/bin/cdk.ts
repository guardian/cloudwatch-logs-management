import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { CloudwatchLogsManagement } from '../lib/cloudwatch-logs-management';

const app = new App();
new CloudwatchLogsManagement(app, 'CloudwatchLogsManagement-PROD', {
	stack: 'cloudwatch-logs-management',
	stage: 'PROD',
});

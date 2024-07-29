import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {stacks} from "../bin/cdk";
import { CloudwatchLogsManagement } from './cloudwatch-logs-management';


describe('The CloudwatchLogsManagement stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const stack = new CloudwatchLogsManagement(app, { stack: 'deploy' });
		const template = Template.fromStack(stack);
		expect(template.toJSON()).toMatchSnapshot();
	});
});


// If stack contains PII data it should have a retention period of max 14 days (See list of retention presets here:
// https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_PutRetentionPolicy.html).
describe('Stacks with containsPIIData set to true', () => {
	it('have retentionInDays <= 14', () => {
		stacks.forEach((stack) => {
			if (stack.containsPIIData && stack.retentionInDays) {
				expect(stack.retentionInDays <= 14).toBe(true);
			};
		});
	});
});

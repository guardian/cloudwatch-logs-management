import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CloudwatchLogsManagementTransfer } from './cloudwatch-logs-management-transfer';

describe('The CloudwatchLogsManagement stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const stack = new CloudwatchLogsManagementTransfer(app, { stack: 'deploy' });
		const template = Template.fromStack(stack);
		expect(template.toJSON()).toMatchSnapshot();
	});
});

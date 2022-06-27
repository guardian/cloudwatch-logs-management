import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CloudwatchLogsManagement } from './cloudwatch-logs-management';

describe('The CloudwatchLogsManagement stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const stack = new CloudwatchLogsManagement(
			app,
			'CloudwatchLogsManagement',
			{ stack: 'cloudwatch-logs-management', stage: 'TEST' },
		);
		const template = Template.fromStack(stack);
		expect(template.toJSON()).toMatchSnapshot();
	});
});

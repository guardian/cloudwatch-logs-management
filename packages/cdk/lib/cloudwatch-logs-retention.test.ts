import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {CloudwatchLogsRetention} from "./cloudwatch-logs-retention";

describe('The CloudwatchLogsRetention stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const stack = new CloudwatchLogsRetention(app, { stack: 'deploy' });
		const template = Template.fromStack(stack);
		expect(template.toJSON()).toMatchSnapshot();
	});
});
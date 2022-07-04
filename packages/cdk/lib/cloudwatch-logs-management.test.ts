import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { stacks } from '../bin/cdk';
import { CloudwatchLogsManagement } from './cloudwatch-logs-management';
import { RiffRaffYamlFile } from './riff-raff-yaml';

describe('The CloudwatchLogsManagement stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const stack = new CloudwatchLogsManagement(app, { stack: 'deploy' });
		const template = Template.fromStack(stack);
		expect(template.toJSON()).toMatchSnapshot();
	});
});

describe('The riff-raff.yaml file', () => {
	it('matches the snapshot', () => {
		const app = new App({ outdir: '/tmp/cdk.out' });
		stacks.forEach((stack) => new CloudwatchLogsManagement(app, stack));

		const riffRaff = new RiffRaffYamlFile(app);
		expect(riffRaff.toYAML()).toMatchSnapshot();
	});
});

import { GuScheduledLambda } from '@guardian/cdk';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { Schedule } from 'aws-cdk-lib/aws-events';
import {
	Effect,
	ManagedPolicy,
	PolicyStatement,
} from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';

export interface CloudwatchLogsManagementForPIIDataProps
	extends Omit<GuStackProps, 'stage' | 'env'> {
	retentionInDays?: number;
}

export class CloudwatchLogsManagementForPIIData extends GuStack {
	constructor(scope: App, props: CloudwatchLogsManagementForPIIDataProps) {
		const {
			stack,
			retentionInDays = 7,
		} = props;

		// The ID will become `CloudwatchLogsManagement-<STACK>`
		const id = `${CloudwatchLogsManagementForPIIData.prototype.constructor.name}-${stack}`;

		super(scope, id, {
			...props,
			stack,

			/*
			 These lambdas do not like siblings!
			 In the past, when more than one instance existed in an account/region, terrible things happened!
			 We now only ever deploy to one stage - PROD.
			 @see https://docs.google.com/document/d/1HNEo6UKQ-JhoXHp0mr-KuGC1Ra_8_BfwSuPq3VgO0AI/edit#
			 */
			stage: 'PROD',
			env: {
				region: 'eu-west-1',
			},
		});

		const { region, account } = this;

		const setPIIDataRetentionLambda = new GuScheduledLambda(this, 'set-pii-data-retention', {
			app: 'set-pii-data-retention',
			runtime: Runtime.NODEJS_20_X,
			fileName: 'set-pii-data-retention.zip',
			handler: 'handlers.setPIIDataRetention',
			rules: [{ schedule: Schedule.rate(Duration.hours(1)) }],
			monitoringConfiguration: { noMonitoring: true },
			environment: {
				RETENTION_IN_DAYS: retentionInDays.toString(),
			},
			timeout: Duration.minutes(1),
		});

		this.overrideLogicalId(setPIIDataRetentionLambda, {
			logicalId: 'SetPIIDataRetentionFunc',
			reason: 'Migrating from YAML',
		});

		const setRetentionPolicy = new ManagedPolicy(this, 'SetPIIDataRetentionPolicy', {
			statements: [
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['logs:DescribeLogGroups', 'logs:PutRetentionPolicy'],
					resources: [`arn:aws:logs:${region}:${account}:log-group:*`],
				}),
			],
		});
		setPIIDataRetentionLambda.role?.addManagedPolicy(setRetentionPolicy);
	}
}

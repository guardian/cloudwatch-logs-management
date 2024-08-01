import { GuScheduledLambda } from '@guardian/cdk';
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
import {CloudwatchLogsManagementProps} from "../bin/cdk";

export class CloudwatchLogsRetention extends GuStack {
	constructor(scope: App, props: CloudwatchLogsManagementProps) {
		const {
			stack,
			retentionInDays = 7,
		} = props;

		// The ID will become `CloudwatchLogsManagement-<STACK>`
		const id = `${CloudwatchLogsRetention.prototype.constructor.name}-${stack}`;

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

		const setRetentionLambda = new GuScheduledLambda(this, 'set-retention', {
			app: 'set-retention',
			runtime: Runtime.NODEJS_20_X,
			fileName: 'set-retention.zip',
			handler: 'handlers.setRetention',
			rules: [{ schedule: Schedule.rate(Duration.hours(1)) }],
			monitoringConfiguration: { noMonitoring: true },
			environment: {
				RETENTION_IN_DAYS: retentionInDays.toString(),
			},
			timeout: Duration.minutes(1),
		});

		this.overrideLogicalId(setRetentionLambda, {
			logicalId: 'SetRetentionFunc',
			reason: 'Migrating from YAML',
		});

		const setRetentionPolicy = new ManagedPolicy(this, 'SetRetentionPolicy', {
			statements: [
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['logs:DescribeLogGroups', 'logs:PutRetentionPolicy'],
					resources: [`arn:aws:logs:${region}:${account}:log-group:*`],
				}),
			],
		});
		setRetentionLambda.role?.addManagedPolicy(setRetentionPolicy);
	}
}

import { GuScheduledLambda } from '@guardian/cdk';
import { GuStack, GuStringParameter } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import { GuS3Bucket } from '@guardian/cdk/lib/constructs/s3';
import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { Schedule } from 'aws-cdk-lib/aws-events';
import {
	Effect,
	ManagedPolicy,
	PolicyStatement,
	ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import type {CloudwatchLogsManagementProps} from "./cloudwatch-logs-management-props";


export class CloudwatchLogsManagement extends GuStack {
	constructor(scope: App, props: CloudwatchLogsManagementProps) {
		const {
			stack,
			logShippingPrefixes = ['/aws/lambda'],
		} = props;

		// The ID will become `CloudwatchLogsManagement-<STACK>`
		const id = `${CloudwatchLogsManagement.prototype.constructor.name}-${stack}`;

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

		const kinesisStreamArn: string = new GuStringParameter(
			this,
			'KinesisStreamArn',
			{
				fromSSM: true,
				default: '/account/services/logging.stream',
				description: 'The ARN (not name) of the kinesis stream to ship logs to',
			},
		).valueAsString;

		const structuredFieldsBucket = new GuS3Bucket(
			this,
			'StructuredFieldsBucket',
			{ app: 'cloudwatch-logs-management' },
		);

		this.overrideLogicalId(structuredFieldsBucket, {
			logicalId: 'StructuredFieldsBucket',
			reason: 'Migrating from YAML',
		});

		const shipLogEntriesLambda = new GuLambdaFunction(
			this,
			'ship-log-entries',
			{
				app: 'ship-log-entries',
				runtime: Runtime.NODEJS_20_X,
				fileName: 'ship-log-entries.zip',
				handler: 'handlers.shipLogEntries',
				timeout: Duration.seconds(5),
				environment: {
					LOG_KINESIS_STREAM: kinesisStreamArn,
					STRUCTURED_DATA_BUCKET: structuredFieldsBucket.bucketName,
				},
			},
		);

		this.overrideLogicalId(shipLogEntriesLambda, {
			logicalId: 'ShipLogEntriesFunc',
			reason: 'Migrating from YAML',
		});

		shipLogEntriesLambda.addPermission('ShipLogEntriesPermission', {
			principal: new ServicePrincipal(`logs.${region}.amazonaws.com`),
			sourceAccount: this.account,
		});

		const shipLogEntriesPolicies = [
			new ManagedPolicy(this, 'ShipLogEntriesPolicy', {
				statements: [
					new PolicyStatement({
						effect: Effect.ALLOW,
						actions: ['kinesis:PutRecords'],
						resources: [kinesisStreamArn],
					}),
					new PolicyStatement({
						effect: Effect.ALLOW,
						actions: ['s3:GetObject'],
						resources: [`${structuredFieldsBucket.bucketArn}/*`],
					}),
				],
			}),

				/*
                 If this lambda accidentally subscribes to its own log group it can create a feedback loop which overwhelms
           Kinesis and spends huge amounts of $$$ on CloudWatch. There is some code which aims to filter out the relevant
           log group when creating subscriptions, but we also use this policy to prevent the lambda from sending log events
           by default, just to be on the safe side.
           If you need to view logs for debugging purposes, the policy below can be temporarily removed from a specific
           account using Riff-Raff
                 */
			new ManagedPolicy(this, 'DisableCloudWatchLoggingPolicy', {
				statements: [
					new PolicyStatement({
						effect: Effect.DENY,
						actions: [
							'logs:CreateLogGroup',
							'logs:CreateLogStream',
							'logs:PutLogEvents',
						],
						resources: [`arn:aws:logs:*:*:*`],
					}),
				],
			}),
		];

		shipLogEntriesPolicies.forEach((policy) =>
				shipLogEntriesLambda.role?.addManagedPolicy(policy),
			);

		const setLogShippingLambda = new GuScheduledLambda(
			this,
			'set-log-shipping',
			{
				app: 'set-log-shipping',
				runtime: Runtime.NODEJS_20_X,
				fileName: 'set-log-shipping.zip',
				handler: 'handlers.setLogShipping',
				rules: [{ schedule: Schedule.rate(Duration.minutes(10)) }],
				monitoringConfiguration: { noMonitoring: true },
				environment: {
					LOG_SHIPPING_LAMBDA_ARN: shipLogEntriesLambda.functionArn,
					LOG_KINESIS_STREAM: kinesisStreamArn,
					LOG_NAME_PREFIXES: logShippingPrefixes.join(','),
					STRUCTURED_DATA_BUCKET: structuredFieldsBucket.bucketName,
				},
				timeout: Duration.minutes(1),
			},
		);

		this.overrideLogicalId(setLogShippingLambda, {
			logicalId: 'SetLogShippingFunc',
			reason: 'Migrating from YAML',
		});

		const setLogShippingPolicy = new ManagedPolicy(
			this,
			'SetLogShippingPolicy',
			{
				statements: [
					new PolicyStatement({
						effect: Effect.ALLOW,
						actions: [
							'logs:DescribeLogGroups',
							'logs:DescribeSubscriptionFilters',
							'logs:PutSubscriptionFilter',
							'logs:DeleteSubscriptionFilter',
						],
						resources: [`arn:aws:logs:${region}:${account}:log-group:*`],
					}),
					new PolicyStatement({
						effect: Effect.ALLOW,
						actions: ['lambda:ListFunctions', 'lambda:ListTags'],
						resources: ['*'],
					}),
					new PolicyStatement({
						effect: Effect.ALLOW,
						actions: ['ecs:ListTaskDefinitions', 'ecs:DescribeTaskDefinition'],
						resources: ['*'],
					}),
					new PolicyStatement({
						effect: Effect.ALLOW,
						actions: ['s3:PutObject'],
						resources: [`${structuredFieldsBucket.bucketArn}/*`],
					}),
				],
			},
		);
		setLogShippingLambda.role?.addManagedPolicy(setLogShippingPolicy);
	}
}
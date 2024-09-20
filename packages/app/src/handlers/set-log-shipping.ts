import { CloudWatchLogs } from '@aws-sdk/client-cloudwatch-logs';
import { ECS } from '@aws-sdk/client-ecs';
import { Lambda } from '@aws-sdk/client-lambda';
import { S3 } from '@aws-sdk/client-s3';
import {
	getCloudWatchLogGroups,
	subscribeGroups,
	unsubscribeGroups,
} from '../cloudwatch';
import { awsClientConfig, getConfigureLogShippingConfig } from '../config';
import { updateStructuredFieldsData } from '../structuredFields';

function eligibleForLogShipping(
	logNamePrefixes: string[],
	groupName: string,
	excludeName: string,
): boolean {
	const matchesPrefix =
		logNamePrefixes.length == 0 ||
		logNamePrefixes.some((prefix) => groupName.startsWith(prefix));
	const isExcluded = groupName === excludeName;
	return matchesPrefix && !isExcluded;
}

export async function setLogShipping(trigger: unknown): Promise<void> {
	const clientConfig = awsClientConfig();

	const cloudwatchLogs = new CloudWatchLogs(clientConfig);
	const s3 = new S3(clientConfig);
	const lambda = new Lambda(clientConfig);
	const ecs = new ECS(clientConfig);

	console.log('Configuring log shipping');
	console.log(JSON.stringify(trigger));
	const {
		logNamePrefixes,
		logShippingFilterName,
		logShippingLambdaArn,
		structuredDataBucket,
		structuredDataKey,
	} = getConfigureLogShippingConfig();

	await updateStructuredFieldsData(
		s3,
		lambda,
		ecs,
		structuredDataBucket,
		structuredDataKey,
	);

	const logShippingLambdaName = logShippingLambdaArn.split(':')[6];

	// get list of log groups
	const allGroups = await getCloudWatchLogGroups(cloudwatchLogs);

	// subscribe those groups that should have shipping enabled
	const logShippingLambdaLogGroupName = `/aws/lambda/${logShippingLambdaName}`;
	console.log(
		`Excluding ${logShippingLambdaLogGroupName} from eligible log groups`,
	);
	const logShippingGroups = allGroups.filter((group) => {
		return eligibleForLogShipping(
			logNamePrefixes,
			group.logGroupName!,
			logShippingLambdaLogGroupName,
		);
	});
	console.log(
		`${
			logShippingGroups.length
		} groups eligible for log shipping: ${logShippingGroups
			.map((group) => group.logGroupName!)
			.join(', ')}`,
	);
	await subscribeGroups(
		cloudwatchLogs,
		logShippingGroups,
		logShippingFilterName,
		logShippingLambdaArn,
	);

	const removeShippingGroups = allGroups.filter((group) => {
		return !eligibleForLogShipping(
			logNamePrefixes,
			group.logGroupName!,
			logShippingLambdaLogGroupName,
		);
	});
	await unsubscribeGroups(
		cloudwatchLogs,
		removeShippingGroups,
		logShippingFilterName,
	);
}

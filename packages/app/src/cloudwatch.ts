import type {
	CloudWatchLogs,
	LogGroup,
	SubscriptionFilter,
} from '@aws-sdk/client-cloudwatch-logs';
import {
	DeleteSubscriptionFilterCommand,
	DescribeLogGroupsCommand,
	DescribeSubscriptionFiltersCommand,
	PutRetentionPolicyCommand,
	PutSubscriptionFilterCommand,
} from '@aws-sdk/client-cloudwatch-logs';

async function getAllLogGroups(
	cloudwatchLogs: CloudWatchLogs,
	logGroupNamePrefix?: string,
): Promise<LogGroup[]> {
	async function rec(acc: LogGroup[], nextToken?: string): Promise<LogGroup[]> {
		const command = new DescribeLogGroupsCommand({
			nextToken,
			logGroupNamePrefix,
		});
		const result = await cloudwatchLogs.send(command);
		const newAcc = acc.concat(result.logGroups ?? []);
		if (result.nextToken) {
			return rec(newAcc, result.nextToken);
		} else {
			return newAcc;
		}
	}
	return rec([]);
}

export async function subscribeGroups(
	cloudwatchLogs: CloudWatchLogs,
	groups: LogGroup[],
	filterName: string,
	targetLambda: string,
): Promise<void> {
	await Promise.all(
		groups.map(async (group) => {
			const subscriptions = await getSubscriptions(
				cloudwatchLogs,
				group.logGroupName!,
				filterName,
			);
			const subscriptionExists = subscriptions.some(
				(sub) =>
					sub.filterName === filterName && sub.destinationArn === targetLambda,
			);
			if (!subscriptionExists) {
				console.log(
					`Adding subscription for ${group.logGroupName!} with name ${filterName}`,
				);
				await putSubscription(
					cloudwatchLogs,
					group.logGroupName!,
					filterName,
					targetLambda,
				);
			}
		}),
	);
}

export async function unsubscribeGroups(
	cloudwatchLogs: CloudWatchLogs,
	groups: LogGroup[],
	filterName: string,
): Promise<void> {
	await Promise.all(
		groups.map(async (group) => {
			const subscriptions = await getSubscriptions(
				cloudwatchLogs,
				group.logGroupName!,
				filterName,
			);
			for (const subscription of subscriptions) {
				if (subscription.filterName === filterName) {
					console.log(
						`Removing subscription for ${group.logGroupName!} with name ${filterName}`,
					);
					await deleteSubscription(
						cloudwatchLogs,
						group.logGroupName!,
						filterName,
					);
				}
			}
		}),
	);
}

export async function getCloudWatchLogGroups(
	cloudwatchLogs: CloudWatchLogs,
	logGroupNamePrefix?: string,
): Promise<LogGroup[]> {
	return await getAllLogGroups(cloudwatchLogs, logGroupNamePrefix);
}

export async function setCloudwatchRetention(
	cloudwatchLogs: CloudWatchLogs,
	groupName: string,
	retentionInDays: number,
): Promise<void> {
	const command = new PutRetentionPolicyCommand({
		logGroupName: groupName,
		retentionInDays,
	});
	await cloudwatchLogs.send(command);
}

export async function getSubscriptions(
	cloudwatchLogs: CloudWatchLogs,
	logGroupName: string,
	filterNamePrefix?: string,
): Promise<SubscriptionFilter[]> {
	const command = new DescribeSubscriptionFiltersCommand({
		logGroupName,
		filterNamePrefix,
	});
	const results = await cloudwatchLogs.send(command);
	if (results.subscriptionFilters) {
		return results.subscriptionFilters;
	} else {
		return [];
	}
}

export async function deleteSubscription(
	cloudwatchLogs: CloudWatchLogs,
	logGroupName: string,
	filterName: string,
): Promise<void> {
	const command = new DeleteSubscriptionFilterCommand({
		logGroupName,
		filterName,
	});
	await cloudwatchLogs.send(command);
}

export async function putSubscription(
	cloudwatchLogs: CloudWatchLogs,
	logGroupName: string,
	filterName: string,
	destinationArn: string,
): Promise<void> {
	const command = new PutSubscriptionFilterCommand({
		logGroupName,
		filterName,
		filterPattern: '', // take everything
		destinationArn,
	});
	await cloudwatchLogs.send(command);
}

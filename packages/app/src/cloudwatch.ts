import type {
	CloudWatchLogs,
	LogGroup,
	SubscriptionFilter,
} from '@aws-sdk/client-cloudwatch-logs';

async function getAllLogGroups(
	cloudwatchLogs: CloudWatchLogs,
	logGroupNamePrefix?: string,
): Promise<LogGroup[]> {
	async function rec(acc: LogGroup[], nextToken?: string): Promise<LogGroup[]> {
		const result = await cloudwatchLogs.describeLogGroups({
			nextToken,
			logGroupNamePrefix,
		});
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
	await cloudwatchLogs.putRetentionPolicy({
		logGroupName: groupName,
		retentionInDays: retentionInDays,
	});
}

export async function getSubscriptions(
	cloudwatchLogs: CloudWatchLogs,
	logGroupName: string,
	filterNamePrefix?: string,
): Promise<SubscriptionFilter[]> {
	const results = await cloudwatchLogs.describeSubscriptionFilters({
		logGroupName,
		filterNamePrefix,
	});
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
	await cloudwatchLogs.deleteSubscriptionFilter({
		logGroupName,
		filterName,
	});
}

export async function putSubscription(
	cloudwatchLogs: CloudWatchLogs,
	logGroupName: string,
	filterName: string,
	destinationArn: string,
): Promise<void> {
	await cloudwatchLogs.putSubscriptionFilter({
		logGroupName,
		filterName,
		filterPattern: '', // take everything
		destinationArn,
	});
}

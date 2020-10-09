import { CloudWatchLogs, CloudWatch } from "aws-sdk";

async function getAllLogGroups(cloudwatchLogs: CloudWatchLogs, logGroupNamePrefix?: string): Promise<CloudWatchLogs.LogGroup[]> {
    async function rec(acc: CloudWatchLogs.LogGroup[], nextToken?: string): Promise<CloudWatchLogs.LogGroup[]> {
        const result = await cloudwatchLogs.describeLogGroups({
            nextToken,
            logGroupNamePrefix
        }).promise();
        const newAcc = acc.concat(result.logGroups || []);
        if (result.nextToken) {
            return rec(newAcc, result.nextToken);
        } else {
            return newAcc;
        }
    }
    return rec([]);
}

export async function subscribeGroups(cloudwatchLogs: CloudWatchLogs, groups: CloudWatchLogs.LogGroup[], filterName: string, targetLambda: string): Promise<void> {
    await Promise.all(groups.map(async (group) => {
        const subscriptions = await getSubscriptions(cloudwatchLogs, group.logGroupName!, filterName);
        const subscriptionExists = subscriptions.some(sub => sub.filterName === filterName && sub.destinationArn === targetLambda);
        if (!subscriptionExists) {
            console.log(`Adding subscription for ${group.logGroupName!} with name ${filterName}`);
            await putSubscription(cloudwatchLogs, group.logGroupName!, filterName, targetLambda);
        }
    }));
}

export async function unsubscribeGroups(cloudwatchLogs: CloudWatchLogs, groups: CloudWatchLogs.LogGroup[], filterName: string): Promise<void> {
    await Promise.all(groups.map(async (group) => {
        const subscriptions = await getSubscriptions(cloudwatchLogs, group.logGroupName!, filterName);
        subscriptions.forEach ( async (subscription) => {
            if (subscription.filterName === filterName) {
                console.log(`Removing subscription for ${group.logGroupName!} with name ${filterName}`);
                await deleteSubscription(cloudwatchLogs, group.logGroupName!, filterName);
            }
        });
    }));
}

export async function getCloudWatchLogGroups(cloudwatchLogs: CloudWatchLogs, logGroupNamePrefix?: string): Promise<CloudWatchLogs.LogGroup[]> {
    return await getAllLogGroups(cloudwatchLogs, logGroupNamePrefix);
}

export async function setCloudwatchRetention(cloudwatchLogs: CloudWatchLogs, groupName: string, retentionInDays: number): Promise<void> {
    await cloudwatchLogs.putRetentionPolicy({
        logGroupName: groupName,
        retentionInDays: retentionInDays
    }).promise();
}

export async function getSubscriptions(cloudwatchLogs: CloudWatchLogs, logGroupName: string, filterNamePrefix?: string): Promise<CloudWatchLogs.SubscriptionFilter[]> {
    const results = await cloudwatchLogs.describeSubscriptionFilters({
        logGroupName,
        filterNamePrefix
    }).promise();
    if (results.subscriptionFilters) {
        return results.subscriptionFilters;
    } else {
        return [];
    }
}

export async function deleteSubscription(cloudwatchLogs: CloudWatchLogs, logGroupName: string, filterName: string): Promise<void> {
    await cloudwatchLogs.deleteSubscriptionFilter({
        logGroupName,
        filterName
    }).promise();
}

export async function putSubscription(cloudwatchLogs: CloudWatchLogs, logGroupName: string, filterName: string, destinationArn: string): Promise<void> {
    await cloudwatchLogs.putSubscriptionFilter({
        logGroupName,
        filterName,
        filterPattern: '', // take everything
        destinationArn,
    }).promise();
}
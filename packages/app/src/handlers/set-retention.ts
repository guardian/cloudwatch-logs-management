import { CloudWatchLogs } from 'aws-sdk';
import { getCloudWatchLogGroups, setCloudwatchRetention } from '../cloudwatch';
import { getCommonConfig, getSetRetentionConfig } from '../config';

const { awsConfig } = getCommonConfig();
const cloudwatchLogs = new CloudWatchLogs(awsConfig);

function sleep(ms: number) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

export async function setRetention(): Promise<void> {
	const { retentionInDays } = getSetRetentionConfig();
	const cloudwatchLogGroups = await getCloudWatchLogGroups(cloudwatchLogs);

	for (const logGroup of cloudwatchLogGroups) {
		if (logGroup.logGroupName === undefined) {
			break; // cannot do anything
		}

		if (logGroup.retentionInDays === retentionInDays) {
			console.log(
				`Log group ${logGroup.logGroupName} retention is already ${retentionInDays} days`,
			);
		} else {
			await setCloudwatchRetention(
				cloudwatchLogs,
				logGroup.logGroupName,
				retentionInDays,
			);
			// avoid hitting the SDK throttling limit
			await sleep(200);
			console.log(
				`Set ${logGroup.logGroupName} retention to ${retentionInDays} days`,
			);
		}
	}
}

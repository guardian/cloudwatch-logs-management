import zlib from 'zlib';
import type {
	CloudWatchLogsDecodedData,
	CloudWatchLogsEvent,
	Context,
} from 'aws-lambda';
import { Kinesis, S3 } from 'aws-sdk';
import type { PutRecordsOutput } from 'aws-sdk/clients/kinesis';
import { BUILD_INFO } from '../build-info';
import { getCommonConfig, getShipLogsConfig } from '../config';
import { putKinesisRecords } from '../kinesis';
import { createStructuredLog } from '../logEntryProcessing';
import type { StructuredFields } from '../model';
import { getStructuredFields } from '../structuredFields';

export async function shipLogEntries(
	event: CloudWatchLogsEvent,
	context: Context,
): Promise<PutRecordsOutput[]> {
	const { awsConfig } = getCommonConfig();
	const { kinesisStreamName, structuredDataBucket, structuredDataKey } =
		getShipLogsConfig();

	const s3 = new S3(awsConfig);
	const kinesis = new Kinesis(awsConfig);

	const payload = Buffer.from(event.awslogs.data, 'base64');
	const json = zlib.gunzipSync(payload).toString('utf8');
	const decoded = JSON.parse(json) as CloudWatchLogsDecodedData;

	console.log('decoded CloudWatch logs to forward', decoded);

	const logGroup = decoded.logGroup;
	const extraFields: StructuredFields = await getStructuredFields(
		s3,
		logGroup,
		structuredDataBucket,
		structuredDataKey,
	).catch((reason: string) => {
		console.log(
			`Unable to get structured fields for ${logGroup} due to ${reason} - falling back to no extra fields`,
		);
		return {};
	});
	const structuredLogs = decoded.logEvents.map((logEvent) => {
		return createStructuredLog(logGroup, decoded.logStream, logEvent, {
			...extraFields,
			...BUILD_INFO,
			ShippedBy: 'cloudwatch-logs-management', // casing matches https://github.com/guardian/devx-logs
		});
	});
	console.log(
		`Sending ${structuredLogs.length} events from ${logGroup} to ${kinesisStreamName})`,
	);

	const result = await putKinesisRecords(
		kinesis,
		kinesisStreamName,
		structuredLogs,
	);

	// If total failed record count across batches > 0,
	// then raise an error so the invocation will be marked as failed
	// and the client of lambda can respond as appropriate for them.
	const failedRecordCount = result.reduce((count, output) => {
		return count + (output.FailedRecordCount ?? 0);
	}, 0);
	if (failedRecordCount > 0) {
		throw new Error(
			`failed to put ${failedRecordCount} record(s) on Kinesis stream`,
		);
	}

	return result;
}

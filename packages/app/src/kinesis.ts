import type {
	Kinesis,
	PutRecordsCommandOutput,
	PutRecordsRequestEntry,
} from '@aws-sdk/client-kinesis';
import { PutRecordsCommand } from '@aws-sdk/client-kinesis';
import type { PublishableStructuredLogData } from './model';

export async function putKinesisRecords(
	kinesis: Kinesis,
	streamName: string,
	logEntries: PublishableStructuredLogData[],
): Promise<PutRecordsCommandOutput[]> {
	const records: PutRecordsRequestEntry[] = logEntries.map((entry) => {
		return {
			Data: new TextEncoder().encode(JSON.stringify(entry)),
			PartitionKey: entry.cloudwatchId,
		};
	});

	// Batch records since each put record request supports at most 500 records
	// https://docs.aws.amazon.com/kinesis/latest/APIReference/API_PutRecords.html
	const batchRecords: PutRecordsRequestEntry[][] = [];
	while (records.length > 0) {
		batchRecords.push(records.splice(0, 500));
	}

	const results = batchRecords.map((batch) => {
		const command = new PutRecordsCommand({
			Records: batch,
			StreamName: streamName,
		});
		return kinesis.send(command);
	});

	return await Promise.all(results);
}

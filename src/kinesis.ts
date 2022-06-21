import type { Kinesis } from "aws-sdk";
import type {
  PutRecordsOutput,
  PutRecordsRequestEntry,
} from "aws-sdk/clients/kinesis";
import type { PublishableStructuredLogData } from "./model";

export async function putKinesisRecords(
  kinesis: Kinesis,
  streamName: string,
  logEntries: PublishableStructuredLogData[]
): Promise<PutRecordsOutput[]> {
  const records: PutRecordsRequestEntry[] = logEntries.map((entry) => {
    return {
      Data: JSON.stringify(entry),
      PartitionKey: entry.cloudwatchId,
    };
  });

  // Batch records since each put record request supports at most 500 records
  // https://docs.aws.amazon.com/kinesis/latest/APIReference/API_PutRecords.html
  const batchRecords: PutRecordsRequestEntry[][] = [];
  while (records.length > 0) {
    batchRecords.push(records.splice(0, 500));
  }

  const results = batchRecords.map((batch) =>
    kinesis
      .putRecords({
        Records: batch,
        StreamName: streamName,
      })
      .promise()
  );

  return await Promise.all(results);
}

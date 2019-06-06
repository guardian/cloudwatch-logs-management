import { Kinesis } from "aws-sdk";
import { PutRecordsRequestEntry } from "aws-sdk/clients/kinesis";

export async function putKinesisRecords(kinesis: Kinesis, streamName: string, logEntries: PublishableStructuredLogData[]): Promise<void> {
    const records: PutRecordsRequestEntry[] = logEntries.map((entry) => {
        return {
            Data: JSON.stringify(entry),
            PartitionKey: entry.cloudwatchId
        }
    });
    await kinesis.putRecords({
        Records: records,
        StreamName: streamName,
    }).promise();
}
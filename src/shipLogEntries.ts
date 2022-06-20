import zlib from "zlib";
import type {
  CloudWatchLogsDecodedData,
  CloudWatchLogsEvent,
  Context,
} from "aws-lambda";
import { ChainableTemporaryCredentials, Kinesis, S3 } from "aws-sdk";
import type { ConfigurationOptions } from "aws-sdk";
import type { PutRecordsOutput } from "aws-sdk/clients/kinesis";
import { getCommonConfig, getShipLogsConfig } from "./config";
import { putKinesisRecords } from "./kinesis";
import { createStructuredLog } from "./logEntryProcessing";
import { getStructuredFields } from "./structuredFields";

const { awsConfig } = getCommonConfig();
const {
  kinesisStreamName,
  kinesisStreamRole,
  structuredDataBucket,
  structuredDataKey,
} = getShipLogsConfig();

const s3 = new S3(awsConfig);
const kinesis = getKinesisClient(awsConfig, kinesisStreamRole);

function getKinesisClient(
  awsConfig: ConfigurationOptions,
  role: string | undefined
): Kinesis {
  if (role) {
    const credentials = new ChainableTemporaryCredentials({
      params: {
        RoleArn: role,
        RoleSessionName: `shipLogEntries-lambda`,
      },
    });
    return new Kinesis({ ...awsConfig, credentials });
  } else {
    return new Kinesis(awsConfig);
  }
}

export async function shipLogEntries(
  event: CloudWatchLogsEvent,
  context: Context
): Promise<PutRecordsOutput[]> {
  const payload = Buffer.from(event.awslogs.data, "base64");
  const json = zlib.gunzipSync(payload).toString("utf8");
  const decoded: CloudWatchLogsDecodedData = JSON.parse(json);

  console.log("decoded CloudWatch logs to forward", decoded);

  const logGroup = decoded.logGroup;
  const extraFields: StructuredFields = await getStructuredFields(
    s3,
    logGroup,
    structuredDataBucket,
    structuredDataKey
  ).catch((reason: string) => {
    console.log(
      `Unable to get structured fields for ${logGroup} due to ${reason} - falling back to no extra fields`
    );
    return {};
  });
  const structuredLogs = decoded.logEvents.map((logEvent) => {
    const log = createStructuredLog(
      logGroup,
      decoded.logStream,
      logEvent,
      extraFields
    );
    return log;
  });
  console.log(
    `Sending ${
      structuredLogs.length
    } events from ${logGroup} to ${kinesisStreamName} (with role: ${
      kinesisStreamRole ?? "UNDEFINED"
    })`
  );

  const result = await putKinesisRecords(
    kinesis,
    kinesisStreamName,
    structuredLogs
  );

  // If total failed record count across batches > 0,
  // then raise an error so the invocation will be marked as failed
  // and the client of lambda can respond as appropriate for them.
  const failedRecordCount = result.reduce((count, output) => {
    return count + (output.FailedRecordCount ?? 0);
  }, 0);
  if (failedRecordCount > 0) {
    throw new Error(
      `failed to put ${failedRecordCount} record(s) on Kinesis stream`
    );
  }

  return result;
}

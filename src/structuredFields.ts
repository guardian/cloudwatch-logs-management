import type { ECS, Lambda, S3 } from "aws-sdk";
import { getAllTaskDefinitions } from "./ecs";
import { getLambdaFunctions } from "./lambda";
import { getData, putData } from "./s3";

/*
    Remove AWS specific tags and make initial char lowercase
*/
function normalisedTags(tags: Tags, lowerFirstCharOfTag: boolean): Tags {
  function transformTagName(name: string): string {
    if (lowerFirstCharOfTag) {
      return name.charAt(0).toLowerCase() + name.slice(1);
    }
    // no transformation? return unaltered...
    return name;
  }

  return Object.keys(tags)
    .filter((key) => !key.startsWith("aws:") && !key.startsWith("lambda:"))
    .reduce(
      (acc: Tags, key) => ((acc[transformTagName(key)] = tags[key]), acc),
      {}
    );
}

async function lambdaLogGroupStructuredFields(
  lambda: Lambda,
  lowerFirstCharOfTag: boolean
): Promise<LogGroupToStructuredFields> {
  // crawl all lambda functions
  const lambdaFunctions = await getLambdaFunctions(lambda);
  // convert into a data map
  const dataMap = lambdaFunctions.reduce(
    (acc: LogGroupToStructuredFields, item) => {
      const filteredTags = normalisedTags(item.tags, lowerFirstCharOfTag);
      acc[`/aws/lambda/${item.functionName}`] = filteredTags;
      return acc;
    },
    {}
  );
  return dataMap;
}

async function ecsTaskLogGroupStructuredFields(
  ecs: ECS,
  lowerFirstCharOfTag: boolean
): Promise<LogGroupToStructuredFields> {
  const taskDefinitions = await getAllTaskDefinitions(ecs);
  const dataMap = taskDefinitions.reduce(
    (acc: LogGroupToStructuredFields, item) => {
      const filteredTags = normalisedTags(item.tags, lowerFirstCharOfTag);
      item.taskDefinition.containerDefinitions?.forEach((cd) => {
        const logGroup = cd.logConfiguration?.options?.["awslogs-group"];
        if (logGroup) {
          acc[logGroup] = filteredTags;
        }
      });
      return acc;
    },
    {}
  );
  return dataMap;
}

export async function updateStructuredFieldsData(
  s3: S3,
  lambda: Lambda,
  ecs: ECS,
  bucket: string,
  key: string,
  lowerFirstCharOfTag: boolean
): Promise<void> {
  const lambdaDataMap = await lambdaLogGroupStructuredFields(
    lambda,
    lowerFirstCharOfTag
  );

  const ecsDataMap = await ecsTaskLogGroupStructuredFields(
    ecs,
    lowerFirstCharOfTag
  );

  // write out tag data to S3
  const data = JSON.stringify({ ...lambdaDataMap, ...ecsDataMap });
  console.log(`Putting new map into S3: ${data}`);
  await putData(s3, bucket, key, data);
}

/**
 * Have `structuredFields` defined at the global context to increase performance,
 * as global variables are available in the same execution environment:
 *
 *   > any process-wide state (such as static state in Java) is available across all invocations within the same execution environment.
 *
 * @see https://docs.aws.amazon.com/lambda/latest/operatorguide/execution-environment.html
 */
let structuredFields: LogGroupToStructuredFields | undefined;

async function getStructuredFieldsData(
  s3: S3,
  bucket: string,
  key: string
): Promise<LogGroupToStructuredFields> {
  structuredFields
    ? console.log("Structured fields cache is available!")
    : console.log("Structured fields cache is unavailable. Fetching from S3.");

  if (!structuredFields) {
    structuredFields = JSON.parse(await getData(s3, bucket, key));
  }
  if (structuredFields) {
    return structuredFields;
  } else {
    return Promise.reject(
      `Unable to get structured fields data from s3://${bucket}/${key}`
    );
  }
}

export async function getStructuredFields(
  s3: S3,
  logGroup: string,
  bucket: string,
  key: string
): Promise<StructuredFields> {
  return (await getStructuredFieldsData(s3, bucket, key))[logGroup];
}

import { getLambdaFunctions } from "./lambda";
import { putData, getData } from "./s3";
import { S3, Lambda } from "aws-sdk";

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

export async function updateStructuredFieldsData(
  s3: S3,
  lambda: Lambda,
  bucket: string,
  key: string,
  lowerFirstCharOfTag: boolean
): Promise<void> {
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
  // write out tag data to S3
  const data = JSON.stringify(dataMap);
  console.log(`Putting new map into S3: ${data}`);
  await putData(s3, bucket, key, data);
}

let structuredFields: LogGroupToStructuredFields | undefined;

async function getStructuredFieldsData(
  s3: S3,
  bucket: string,
  key: string
): Promise<LogGroupToStructuredFields> {
  if (!structuredFields) {
    structuredFields = JSON.parse(await getData(s3, bucket, key));
  }
  if (!!structuredFields) {
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

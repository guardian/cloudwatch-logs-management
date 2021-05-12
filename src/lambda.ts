import type { Lambda } from "aws-sdk";
import type { FunctionConfiguration } from "aws-sdk/clients/lambda";

async function getAllFunctions(
  lambda: Lambda
): Promise<FunctionConfiguration[]> {
  async function rec(
    acc: FunctionConfiguration[],
    marker?: string
  ): Promise<FunctionConfiguration[]> {
    const result = await lambda
      .listFunctions({
        Marker: marker,
      })
      .promise();
    const newAcc = acc.concat(result.Functions ?? []);
    if (result.NextMarker) {
      return rec(newAcc, result.NextMarker);
    } else {
      return newAcc;
    }
  }
  return rec([]);
}

interface AwsLambdaFunction {
  FunctionArn: string;
  FunctionName: string;
}

export async function getLambdaFunctions(
  lambda: Lambda
): Promise<LambdaFunction[]> {
  const functions = await getAllFunctions(lambda);
  const results = Promise.all(
    functions
      .filter(
        (fn): fn is AwsLambdaFunction => !!fn.FunctionName && !!fn.FunctionArn
      )
      .map(async (fn: AwsLambdaFunction): Promise<LambdaFunction> => {
        const results = await lambda
          .listTags({
            Resource: fn.FunctionArn,
          })
          .promise();
        return {
          functionArn: fn.FunctionArn,
          functionName: fn.FunctionName,
          tags: results.Tags ?? {},
        };
      })
  );
  return results;
}

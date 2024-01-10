import {
	type FunctionConfiguration,
	type Lambda,
	ListFunctionsCommand,
	ListTagsCommand,
} from '@aws-sdk/client-lambda';
import type { LambdaFunction } from './model';

async function getAllFunctions(
	lambda: Lambda,
): Promise<FunctionConfiguration[]> {
	async function rec(
		acc: FunctionConfiguration[],
		marker?: string,
	): Promise<FunctionConfiguration[]> {
		const command = new ListFunctionsCommand({
			Marker: marker,
		});
		const result = await lambda.send(command);
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
	lambda: Lambda,
): Promise<LambdaFunction[]> {
	const functions = await getAllFunctions(lambda);
	const results = Promise.all(
		functions
			.filter(
				(fn): fn is AwsLambdaFunction => !!fn.FunctionName && !!fn.FunctionArn,
			)
			.map(async (fn: AwsLambdaFunction): Promise<LambdaFunction> => {
				const command = new ListTagsCommand({
					Resource: fn.FunctionArn,
				});
				const results = await lambda.send(command);
				return {
					functionArn: fn.FunctionArn,
					functionName: fn.FunctionName,
					tags: results.Tags ?? {},
				};
			}),
	);
	return results;
}

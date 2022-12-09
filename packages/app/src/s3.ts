import type { S3 } from '@aws-sdk/client-s3';

export async function putData(
	s3: S3,
	bucket: string,
	key: string,
	data: string,
): Promise<void> {
	await s3.putObject({
		Bucket: bucket,
		Key: key,
		Body: data,
		ContentType: 'application/json; charset=utf-8',
	});
}

export async function getData(
	s3: S3,
	bucket: string,
	key: string,
): Promise<string> {
	const result = await s3.getObject({
		Bucket: bucket,
		Key: key,
	});
	if (result.Body) {
		return result.Body.toString();
	} else {
		return Promise.reject(`Value at s3://${bucket}/${key} could not be found`);
	}
}

import type { S3 } from '@aws-sdk/client-s3';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

export async function putData(
	s3: S3,
	bucket: string,
	key: string,
	data: string,
): Promise<void> {
	const command = new PutObjectCommand({
		Bucket: bucket,
		Key: key,
		Body: data,
		ContentType: 'application/json; charset=utf-8',
	});
	await s3.send(command);
}

export async function getData(
	s3: S3,
	bucket: string,
	key: string,
): Promise<string> {
	const command = new GetObjectCommand({
		Bucket: bucket,
		Key: key,
	});
	const result = await s3.send(command);
	if (result.Body) {
		return result.Body.toString();
	} else {
		return Promise.reject(`Value at s3://${bucket}/${key} could not be found`);
	}
}

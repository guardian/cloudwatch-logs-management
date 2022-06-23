import type { ConfigurationOptions } from 'aws-sdk';

interface CommonConfig {
	awsConfig: ConfigurationOptions;
}

interface SetRetentionConfig {
	retentionInDays: number;
}

interface StructuredDataConfig {
	structuredDataBucket: string;
	structuredDataKey: string;
}

interface ConfigureLogShippingConfig extends StructuredDataConfig {
	logNamePrefixes: string[];
	logShippingFilterName: string;
	logShippingLambdaArn: string;
}

interface ShipLogsConfig extends StructuredDataConfig {
	kinesisStreamName: string;
}

function getRequiredEnv(
	key: string,
	devDefault: string | undefined = undefined,
): string {
	const value = process.env[key];
	if (!value) {
		const stage = process.env[key] ?? 'DEV';
		if (stage == 'PROD' || stage == 'CODE' || !devDefault) {
			throw new Error(`Missing ENV var ${key}`);
		} else {
			return devDefault;
		}
	} else {
		return value;
	}
}

export function getCommonConfig(): CommonConfig {
	const region = getRequiredEnv('AWS_REGION');
	const maxRetries = parseInt(getRequiredEnv('AWS_RETRIES', '10'));
	return {
		awsConfig: {
			region,
			maxRetries: maxRetries,
		},
	};
}

export function getSetRetentionConfig(): SetRetentionConfig {
	const retentionInDays = parseInt(getRequiredEnv('RETENTION_IN_DAYS', '14'));
	return {
		retentionInDays,
	};
}

export function getConfigureLogShippingConfig(): ConfigureLogShippingConfig {
	const logNamePrefixes = getRequiredEnv('LOG_NAME_PREFIXES', '')
		.split(',')
		.filter((prefix) => prefix.length !== 0);
	const logShippingFilterName = getRequiredEnv('LOG_SHIPPING_FILTER_NAME');
	const logShippingLambdaArn = getRequiredEnv('LOG_SHIPPING_LAMBDA_ARN');
	const structuredDataBucket = getRequiredEnv('STRUCTURED_DATA_BUCKET');

	return {
		logNamePrefixes,
		logShippingFilterName,
		logShippingLambdaArn,
		structuredDataBucket,
		structuredDataKey: 'structured-data.json',
	};
}

export function getShipLogsConfig(): ShipLogsConfig {
	const kinesisStream = getRequiredEnv('LOG_KINESIS_STREAM');
	const structuredDataBucket = getRequiredEnv('STRUCTURED_DATA_BUCKET');
	const kinesisStreamName = kinesisStream.includes('/')
		? kinesisStream.split('/')[1]
		: kinesisStream;

	return {
		kinesisStreamName,
		structuredDataBucket,
		structuredDataKey: 'structured-data.json',
	};
}

interface CommonConfig {
    region: string,
}

interface SetRetentionConfig {
    retentionInDays: number,
}

interface StructuredDataConfig {
    structuredDataBucket: string,
    structuredDataKey: string,
}

interface ConfigureLogShippingConfig extends StructuredDataConfig {
    logNamePrefixes: string[],
    logShippingFilterName: string,
    logShippingLambdaArn: string,
    optionLowerFirstCharOfTags: boolean
}

interface ShipLogsConfig extends StructuredDataConfig {
    kinesisStream: string,
}

function getRequiredEnv(key: string, devDefault: string | undefined = undefined): string {
    const value = process.env[key];
    if (!value) {
        const stage = process.env[key] || 'DEV';
        if(stage == "PROD" || stage == "CODE" || !devDefault) {
            throw new Error(`Missing ENV var ${key}`);
        } else {
            return devDefault;
        }
    } else {
        return value;
    }
}

export function getCommonConfig(): CommonConfig {
    const region = getRequiredEnv("AWS_REGION");
    return {
        region,
    };
}

export function getSetRetentionConfig(): SetRetentionConfig {
    const retentionInDays = parseInt(getRequiredEnv("RETENTION_IN_DAYS", "14"));
    return {
        retentionInDays,
    };
}

export function getConfigureLogShippingConfig(): ConfigureLogShippingConfig {
    const logNamePrefixes = getRequiredEnv("LOG_NAME_PREFIXES", "").split(",").filter(prefix => prefix.length !== 0);
    const logShippingFilterName = getRequiredEnv("LOG_SHIPPING_FILTER_NAME");
    const logShippingLambdaArn = getRequiredEnv("LOG_SHIPPING_LAMBDA_ARN");
    const structuredDataBucket = getRequiredEnv("STRUCTURED_DATA_BUCKET");
    const optionLowerFirstCharOfTags = getRequiredEnv("OPTION_LOWER_FIRST_CHAR_OF_TAGS") === 'true';

    return {
        logNamePrefixes,
        logShippingFilterName,
        logShippingLambdaArn,
        structuredDataBucket,
        structuredDataKey: 'structured-data.json',
        optionLowerFirstCharOfTags
    };
}

export function getShipLogsConfig(): ShipLogsConfig {
    const kinesisStream = getRequiredEnv("LOG_KINESIS_STREAM");
    const structuredDataBucket = getRequiredEnv("STRUCTURED_DATA_BUCKET");

    return {
        kinesisStream,
        structuredDataBucket,
        structuredDataKey: 'structured-data.json'
    };
}
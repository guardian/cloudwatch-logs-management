import zlib from 'zlib';

import { CloudWatchLogsEvent, CloudWatchLogsDecodedData, CloudWatchLogsLogEvent } from "aws-lambda";
import { CloudWatchLogs, Kinesis, S3, Lambda } from 'aws-sdk';

import { getCommonConfig, getSetRetentionConfig, getConfigureLogShippingConfig, getShipLogsConfig } from './config';
import { getCloudWatchLogGroups, setCloudwatchRetention, subscribeGroups, unsubscribeGroups } from "./cloudwatch";
import { putKinesisRecords } from './kinesis';
import { getLambdaFunctions } from './lambda';
import { putData, getData } from './s3';

const { region } = getCommonConfig();

const cloudwatchLogs = new CloudWatchLogs({ region, maxRetries: 10 });
const kinesis = new Kinesis({ region, maxRetries: 10 });
const s3 = new S3({ region });
const lambda = new Lambda({ region });

function sleep(ms: number){
    return new Promise(resolve=>{
        setTimeout(resolve, ms)
    })
}

export async function setRetention(): Promise<void> {
    const { retentionInDays } = getSetRetentionConfig();

    const cloudwatchLogGroups = await getCloudWatchLogGroups(cloudwatchLogs);
    for(const logGroup of cloudwatchLogGroups) {
        if (logGroup.retentionInDays === retentionInDays) {
            console.log(`Log group ${logGroup.logGroupName} retention is already ${retentionInDays} days`);
        } else {
            await setCloudwatchRetention(cloudwatchLogs, logGroup.logGroupName!, retentionInDays);
            // avoid hitting the SDK throttling limit
            await sleep(200);
            console.log(`Set ${logGroup.logGroupName} retention to ${retentionInDays} days`);
        }
    }
}

function eligibleForLogShipping(logNamePrefixes: string[], groupName: string, excludeName: string): boolean {
    const matchesPrefix = logNamePrefixes.length == 0 || logNamePrefixes.some(prefix => groupName.startsWith(prefix));
    const isExcluded = groupName === excludeName;
    return matchesPrefix && !isExcluded;
}

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
        .filter((key) => !key.startsWith('aws:') && !key.startsWith('lambda:'))
        .reduce((acc: Tags, key) => (acc[transformTagName(key)] = tags[key], acc), {});
}

async function updateStructuredFieldsData(s3: S3, lambda: Lambda, bucket: string, key: string, lowerFirstCharOfTag: boolean): Promise<void> {
    // crawl all lambda functions
    const lambdaFunctions = await getLambdaFunctions(lambda);
    // convert into a data map
    const dataMap = lambdaFunctions.reduce((acc: LogGroupToStructuredFields, item) => {
        const filteredTags = normalisedTags(item.tags, lowerFirstCharOfTag);
        acc[`/aws/lambda/${item.functionName}`] = filteredTags;
        return acc;
      }, {})
    // write out tag data to S3
    const data = JSON.stringify(dataMap)
    console.log(`Putting new map into S3: ${data}`)
    await putData(s3, bucket, key, data);
}


let structuredFields: LogGroupToStructuredFields | undefined;

async function getStructuredFieldsData(bucket: string, key: string): Promise<LogGroupToStructuredFields> {
    if (!structuredFields) {
        structuredFields = JSON.parse(await getData(s3, bucket, key));
    }
    if (!!structuredFields) {
        return structuredFields;
    } else {
        return Promise.reject(`Unable to get structured fields data from s3://${bucket}/${key}`);
    }
}

async function getStructuredFields(logGroup: string, bucket: string, key: string): Promise<StructuredFields> {
    return (await getStructuredFieldsData(bucket, key))[logGroup];
}

export async function setLogShipping(trigger: any): Promise<void> {
    console.log('Configuring log shipping');
    console.log(JSON.stringify(trigger));
    const { logNamePrefixes, logShippingFilterName, logShippingLambdaArn,
         structuredDataBucket, structuredDataKey, optionLowerFirstCharOfTags } = getConfigureLogShippingConfig();

    await updateStructuredFieldsData(s3, lambda, structuredDataBucket, structuredDataKey, optionLowerFirstCharOfTags);

    const logShippingLambdaName = logShippingLambdaArn.split(':')[6];
    
    // get list of log groups
    const allGroups = await getCloudWatchLogGroups(cloudwatchLogs);
    
    // subscribe those groups that should have shipping enabled
    const logShippingLambdaLogGroupName = `/aws/lambda/${logShippingLambdaName}`;
    console.log(`Excluding ${logShippingLambdaLogGroupName} from eligible log groups`);
    const logShippingGroups = allGroups.filter((group) => {
        return eligibleForLogShipping(logNamePrefixes, group.logGroupName!, logShippingLambdaLogGroupName);
    });
    console.log(`${logShippingGroups.length} groups eligible for log shipping: ${logShippingGroups.map(group => group.logGroupName!).join(', ')}`);
    await subscribeGroups(cloudwatchLogs, logShippingGroups, logShippingFilterName, logShippingLambdaArn)

    const removeShippingGroups = allGroups.filter((group) => {
        return !eligibleForLogShipping(logNamePrefixes, group.logGroupName!, logShippingLambdaLogGroupName);
    });
    await unsubscribeGroups(cloudwatchLogs, removeShippingGroups, logShippingFilterName);
}

function isRequestLogEntry(line: string): boolean {
    return line.startsWith('START RequestId: ') ||
           line.startsWith('END RequestId: ') ||
           line.startsWith('REPORT RequestId: ') 
}

function fieldValue(text: string, fieldNameText: string, valueLength?: number): string {
    return text.substr(text.indexOf(fieldNameText)+fieldNameText.length, valueLength).trim();
}

/**
 * Parse an AWS lambda report field into a field name and a value
 * @param rawField The raw field that looks something like "Field Name: value unit"
 */
function parseReportField(rawField: string): [string, any] {
    const [rawFieldName, rawFieldValue] = rawField.split(':').map(s => s.trim());

    const fieldNameNoSpaces = rawFieldName.replace(/ /g, '');
    const fieldName = fieldNameNoSpaces.charAt(0).toLowerCase() + fieldNameNoSpaces.slice(1);

    const [value, unit] = rawFieldValue.split(' ');

    if (unit == 'ms' || unit == 'MB') {
        // value should be numeric
        const numericValue = parseFloat(value);
        return [fieldName + unit, numericValue] as [string, any];
    } else {
        // we didn't recognise the unit, perhaps there isn't one
        return [fieldName, rawFieldValue] as [string, any];
    }
}

function lambdaRequestLogData(line: string): StructuredLogData | undefined {
    if (isRequestLogEntry(line)) {
        const eventName = line.substr(0, line.indexOf(' '));
        const requestId = fieldValue(line, 'RequestId:', 36);
        const base = {
            lambdaEvent: eventName,
            lambdaRequestId: requestId
        };
        let stats: StructuredLogData = {};
        switch(eventName) {
            case 'END':
                // no other fields
                break;
            case 'START':
                // extract Version:
                const version = fieldValue(line, 'Version:');
                stats = {
                    lambdaVersion: version
                };
                break;
            case 'REPORT':
                // extract other fields (conveniently tab separated)
                const rawFields = line.split('\t').slice(1).map(s => s.trim()).filter(s => s.length > 0);
                const fields: [string, any][] = rawFields.map(rawField => parseReportField(rawField));
                stats = fields.reduce((acc: StructuredLogData, field) => {
                    const [fieldName, fieldValue] = field;
                    acc[fieldName] = fieldValue;
                    return acc;
                }, {});
                break;
        }

        return Object.assign(base, {
            lambdaStats: stats
        });
    } else {
        return undefined;
    }
}

function createStructuredLog(logGroup: string, logEvent: CloudWatchLogsLogEvent, extraFields: StructuredFields): PublishableStructuredLogData {
    let structuredLog: StructuredLogData;
    const lambdaRequestLogDataFields = lambdaRequestLogData(logEvent.message);
    if (!!lambdaRequestLogDataFields) {
        structuredLog = Object.assign(lambdaRequestLogDataFields, {
            'message': logEvent.message,
        });
    } else {
        try {
            structuredLog = JSON.parse(logEvent.message);
        } catch (err) {
            structuredLog = {
                'message': logEvent.message,
            };
        }
    }
    const publishable: PublishableStructuredLogData = 
        Object.assign(structuredLog, {
            '@timestamp': structuredLog.timestamp || new Date(logEvent.timestamp).toISOString(),
            cloudwatchId: logEvent.id,
            cloudwatchLogGroup: logGroup,
        });
    return Object.keys(extraFields)
        .reduce((acc: PublishableStructuredLogData, key) => {
            if (!!acc[key]) {
                acc[`overwrittenFields.${key}`] = acc[key];
            }
            acc[key] = extraFields[key];
            return acc;
        }, publishable);
}

export async function shipLogEntries(event: CloudWatchLogsEvent): Promise<void> {
    const { kinesisStreamName, structuredDataBucket, structuredDataKey } = getShipLogsConfig();

    const payload = new Buffer(event.awslogs.data, 'base64');
    const json = zlib.gunzipSync(payload).toString('utf8');
    const decoded: CloudWatchLogsDecodedData = JSON.parse(json);

    const logGroup = decoded.logGroup;
    const extraFields: StructuredFields = 
        await getStructuredFields(logGroup, structuredDataBucket, structuredDataKey).catch((reason) => {
            console.log(`Unable to get structured fields for ${logGroup} due to ${reason} - falling back to no extra fields`)
            return {};
        });
    const structuredLogs = decoded.logEvents.map((logEvent) => createStructuredLog(logGroup, logEvent, extraFields));
    console.log(`Sending ${structuredLogs.length} events from ${logGroup} to ${kinesisStreamName}`)
    await putKinesisRecords(kinesis, kinesisStreamName, structuredLogs);
}
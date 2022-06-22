import type { CloudWatchLogsLogEvent } from 'aws-lambda';
import type {
	PublishableStructuredLogData,
	StructuredFields,
	StructuredLogData,
} from './model';

export function isRequestLogEntry(line: string): boolean {
	return (
		line.startsWith('START RequestId: ') ||
		line.startsWith('END RequestId: ') ||
		line.startsWith('REPORT RequestId: ')
	);
}

export function fieldValue(
	text: string,
	fieldNameText: string,
	valueLength?: number,
): string {
	const colonAndSpaceSeparator = 2;
	return text
		.substr(
			text.indexOf(fieldNameText) +
				fieldNameText.length +
				colonAndSpaceSeparator,
			valueLength,
		)
		.trim();
}

/**
 * Parse an AWS lambda report field into a field name and a value
 * @param rawField The raw field that looks something like "Field Name: value unit"
 */
export function parseReportField(rawField: string): [string, unknown] {
	const [rawFieldName, rawFieldValue] = rawField
		.split(':')
		.map((s) => s.trim());

	const fieldNameNoSpaces = rawFieldName.replace(/ /g, '');
	const fieldName =
		fieldNameNoSpaces.charAt(0).toLowerCase() + fieldNameNoSpaces.slice(1);

	const [value, unit] = rawFieldValue.split(' ');

	if (unit === 'ms' || unit === 'MB') {
		// value should be numeric
		const numericValue = parseFloat(value);
		return [fieldName + unit, numericValue] as [string, unknown];
	} else {
		// we didn't recognise the unit, perhaps there isn't one
		return [fieldName, rawFieldValue] as [string, unknown];
	}
}

export function lambdaRequestLogData(
	line: string,
): StructuredLogData | undefined {
	if (!isRequestLogEntry(line)) {
		return undefined;
	} else {
		const eventName = line.substr(0, line.indexOf(' '));
		const requestId = fieldValue(line, 'RequestId', 36);
		const base = {
			lambdaEvent: eventName,
			lambdaRequestId: requestId,
		};

		switch (eventName) {
			case 'END':
				// no other fields
				return {
					...base,
					lambdaStats: {},
				};
			case 'START': {
				// extract Version:
				const version = fieldValue(line, 'Version');
				const stats: StructuredLogData = {
					lambdaVersion: version,
				};

				return {
					...base,
					lambdaStats: stats,
				};
			}
			case 'REPORT': {
				// extract other fields (conveniently tab separated)
				const rawFields = line
					.split('\t')
					.slice(1)
					.map((s) => s.trim())
					.filter((s) => s.length > 0);

				const fields: Array<[string, unknown]> = rawFields.map((rawField) =>
					parseReportField(rawField),
				);
				const stats: StructuredLogData = fields.reduce(
					(acc: StructuredLogData, field) => {
						const [fieldName, fieldValue] = field;
						acc[fieldName] = fieldValue;
						return acc;
					},
					{},
				);

				return {
					...base,
					lambdaStats: stats,
				};
			}
		}
	}
}

export function parseMessageJson(line: string): StructuredLogData {
	try {
		return JSON.parse(line.trim()) as StructuredLogData;
	} catch (err) {
		return {
			message: line.trim(),
		};
	}
}

// this parses a log line of the format <date>\t<requestId>\t<level>\t<message>
export function parseNodeLogFormat(
	logGroup: string,
	line: string,
): StructuredLogData | undefined {
	const elements = line.split('\t');
	const [dateString, lambdaRequestId, level, ...messageParts] = elements;
	const isDate = !isNaN(Date.parse(dateString));
	if (elements.length >= 4 && isDate) {
		const message = messageParts.join('\t');
		const structuredLog = parseMessageJson(message);
		return {
			// put level first so it can be overriden if structured log contains level
			level,
			...structuredLog,
			//timestamp: dateString, // this makes it explode for some reason
			// put lambdaRequestId last so it can never be overwritten
			lambdaRequestId,
		};
	}
}

// parse a log line
export function parseLambdaLogLine(
	logGroup: string,
	line: string,
): StructuredLogData {
	const lambdaRequestLogDataFields = lambdaRequestLogData(line);
	if (lambdaRequestLogDataFields) {
		return Object.assign(lambdaRequestLogDataFields, {
			message: line,
		});
	}
	// next see if this is the log line type we get from
	const nodeLogData = parseNodeLogFormat(logGroup, line);
	if (nodeLogData) {
		return nodeLogData;
	}
	// fall back to normal parsing
	return parseMessageJson(line);
}

export function createStructuredLog(
	logGroup: string,
	logStream: string,
	logEvent: CloudWatchLogsLogEvent,
	extraFields: StructuredFields,
): PublishableStructuredLogData {
	const structuredLog = parseLambdaLogLine(logGroup, logEvent.message.trim());

	const timestamp: string = structuredLog.timestamp
		? (structuredLog.timestamp as string)
		: new Date(logEvent.timestamp).toISOString();

	const publishable: PublishableStructuredLogData = {
		...structuredLog,
		'@timestamp': timestamp,
		cloudwatchId: logEvent.id,
		cloudwatchLogGroup: logGroup,
		cloudwatchLogStream: logStream,
	};
	return Object.keys(extraFields).reduce(
		(acc: PublishableStructuredLogData, key) => {
			if (acc[key]) {
				acc[`overwrittenFields.${key}`] = acc[key];
			}
			acc[key] = extraFields[key];
			return acc;
		},
		publishable,
	);
}

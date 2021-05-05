interface LogGroupToStructuredFields {
  [logGroup: string]: StructuredFields;
}

interface StructuredFields {
  [name: string]: string;
}

interface StructuredLogData {
  [name: string]: any;
}

interface PublishableStructuredLogData {
  "@timestamp": string;
  cloudwatchId: string;
  cloudwatchLogGroup: string;
  [name: string]: any;
}

interface Tags {
  [name: string]: string;
}

interface LambdaFunction {
  functionName: string;
  functionArn: string;
  tags: Tags;
}

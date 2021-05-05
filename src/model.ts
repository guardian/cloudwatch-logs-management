type LogGroupToStructuredFields = Record<string, StructuredFields>;

type StructuredFields = Record<string, string>;

type StructuredLogData = Record<string, any>;

interface PublishableStructuredLogData {
  "@timestamp": string;
  cloudwatchId: string;
  cloudwatchLogGroup: string;
  [name: string]: any;
}

type Tags = Record<string, string>;

interface LambdaFunction {
  functionName: string;
  functionArn: string;
  tags: Tags;
}

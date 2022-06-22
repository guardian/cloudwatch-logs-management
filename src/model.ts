export type LogGroupToStructuredFields = Record<string, StructuredFields>;

export type StructuredFields = Record<string, string>;

export type StructuredLogData = Record<string, unknown>;

export interface PublishableStructuredLogData {
  "@timestamp": string;
  cloudwatchId: string;
  cloudwatchLogGroup: string;
  [name: string]: unknown;
}

export type Tags = Record<string, string>;

export interface LambdaFunction {
  functionName: string;
  functionArn: string;
  tags: Tags;
}

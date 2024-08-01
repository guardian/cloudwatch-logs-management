import type {GuStackProps} from "@guardian/cdk/lib/constructs/core";

export interface CloudwatchLogsManagementProps
    extends Omit<GuStackProps, 'stage' | 'env'> {
    retentionInDays?: number;
    logShippingPrefixes?: string[];
}
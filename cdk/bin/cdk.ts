#!/usr/bin/env node

import "source-map-support/register";
import { App } from "@aws-cdk/core";
import { CloudwatchLogsManagement } from "../lib/cloudwatch-logs-management";

const app = new App();
//  TODO: Add stack name
//   e.g. { stack: "SomeStack" }
new CloudwatchLogsManagement(app, "Template", {
  stack: "cloudwatch-logs-management",
  migratedFromCloudFormation: true,
});

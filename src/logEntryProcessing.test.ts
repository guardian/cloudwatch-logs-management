import {
  fieldValue,
  isRequestLogEntry,
  lambdaRequestLogData,
  parseLambdaLogLine,
  parseMessageJson,
  parseNodeLogFormat,
  parseReportField,
} from "./logEntryProcessing";
import { log } from "util";

test("AWS Lambda Function reports are identified as request log entries", () => {
  const logLine =
    "REPORT RequestId: b1f86b7f-67b8-45a8-926b-1699f0f7ccae\tDuration: 1028.81 ms\tBilled Duration: 1029 ms\tMemory Size: 1024 MB\tMax Memory Used: 220 MB\t";
  expect(isRequestLogEntry(logLine)).toBe(true);
});

test("Custom log lines are not identified as request log entries", () => {
  const logLine = "There was an error when fetching data from CAPI";
  expect(isRequestLogEntry(logLine)).toBe(false);
});

test("Extracts a request ID correctly", () => {
  const logLine =
    "REPORT RequestId: b1f86b7f-67b8-45a8-926b-1699f0f7ccae\tDuration: 1028.81 ms\tBilled Duration: 1029 ms\tMemory Size: 1024 MB\tMax Memory Used: 220 MB\t";
  const expected = "b1f86b7f-67b8-45a8-926b-1699f0f7ccae";
  expect(fieldValue(logLine, "RequestId", 36)).toBe(expected);
});

test("Extracts version correctly", () => {
  const logLine =
    "START RequestId: b1f86b7f-67b8-45a8-926b-1699f0f7ccae Version: $LATEST";
  const expected = "$LATEST";
  expect(fieldValue(logLine, "Version")).toBe(expected);
});

test("Parses numeric fields from AWS Lambda Function reports", () => {
  const durationField = "Duration: 1028.81 ms";
  const expected = ["durationms", 1028.81];
  expect(parseReportField(durationField)).toStrictEqual(expected);
});

test("Parses non-numeric fields from AWS Lambda Function reports", () => {
  const requestIdField = "RequestId: b1f86b7f-67b8-45a8-926b-1699f0f7ccae";
  const expected = ["requestId", "b1f86b7f-67b8-45a8-926b-1699f0f7ccae"];
  expect(parseReportField(requestIdField)).toStrictEqual(expected);
});

test("Builds the correct StructuredLogData for START events", () => {
  const logLine =
    "START RequestId: b1f86b7f-67b8-45a8-926b-1699f0f7ccae Version: $LATEST";
  const expected = {
    lambdaEvent: "START",
    lambdaRequestId: "b1f86b7f-67b8-45a8-926b-1699f0f7ccae",
    lambdaStats: {
      lambdaVersion: "$LATEST",
    },
  };
  expect(lambdaRequestLogData(logLine)).toStrictEqual(expected);
});

test("Builds the correct StructuredLogData for END events", () => {
  const logLine = "END RequestId: b1f86b7f-67b8-45a8-926b-1699f0f7ccae";
  const expected = {
    lambdaEvent: "END",
    lambdaRequestId: "b1f86b7f-67b8-45a8-926b-1699f0f7ccae",
    lambdaStats: {},
  };
  expect(lambdaRequestLogData(logLine)).toStrictEqual(expected);
});

test("Builds the correct StructuredLogData for REPORT events", () => {
  const logLine =
    "REPORT RequestId: b1f86b7f-67b8-45a8-926b-1699f0f7ccae\tDuration: 1028.81 ms\tBilled Duration: 1029 ms\tMemory Size: 1024 MB\tMax Memory Used: 220 MB\t";
  const expected = {
    lambdaEvent: "REPORT",
    lambdaRequestId: "b1f86b7f-67b8-45a8-926b-1699f0f7ccae",
    lambdaStats: {
      billedDurationms: 1029,
      durationms: 1028.81,
      maxMemoryUsedMB: 220,
      memorySizeMB: 1024,
    },
  };
  expect(lambdaRequestLogData(logLine)).toStrictEqual(expected);
});

test("Does not attempt to build StructuredLogData for custom events", () => {
  const logLine = "There was an error when fetching data from CAPI";
  expect(lambdaRequestLogData(logLine)).toStrictEqual(undefined);
});

test("Parses JSON log lines successfully", () => {
  const logLine = '{ "test": "value" }';
  const expected = {
    test: "value",
  };
  expect(parseMessageJson(logLine)).toStrictEqual(expected);
});

test("Handles non-JSON log lines gracefully", () => {
  const logLine = "There was an error when fetching data from CAPI";
  const expected = {
    message: logLine,
  };
  expect(parseMessageJson(logLine)).toStrictEqual(expected);
});

test("Handles node log format gracefully", () => {
  const logGroup = "/aws/lambda/app-name-PROD";
  const logLine =
    "2021-03-17\tb1f86b7f-67b8-45a8-926b-1699f0f7ccae\tERROR\tThere was an error when fetching data from CAPI";
  const expected = {
    level: "ERROR",
    message: "There was an error when fetching data from CAPI",
    lambdaRequestId: "b1f86b7f-67b8-45a8-926b-1699f0f7ccae",
  };
  expect(parseNodeLogFormat(logGroup, logLine)).toStrictEqual(expected);
});

test("Correctly identifies and returns parsed AWS Lambda Function reports", () => {
  const logGroup = "/aws/lambda/app-name-PROD";
  const logLine =
    "REPORT RequestId: b1f86b7f-67b8-45a8-926b-1699f0f7ccae\tDuration: 1028.81 ms\tBilled Duration: 1029 ms\tMemory Size: 1024 MB\tMax Memory Used: 220 MB\t";
  const expected = {
    lambdaEvent: "REPORT",
    lambdaRequestId: "b1f86b7f-67b8-45a8-926b-1699f0f7ccae",
    lambdaStats: {
      billedDurationms: 1029,
      durationms: 1028.81,
      maxMemoryUsedMB: 220,
      memorySizeMB: 1024,
    },
    message:
      "REPORT RequestId: b1f86b7f-67b8-45a8-926b-1699f0f7ccae\tDuration: 1028.81 ms\tBilled Duration: 1029 ms\tMemory Size: 1024 MB\tMax Memory Used: 220 MB\t",
  };
  expect(parseLambdaLogLine(logGroup, logLine)).toStrictEqual(expected);
});

test("Correctly identifies and returns parsed node log lines", () => {
  const logGroup = "/aws/lambda/app-name-PROD";
  const logLine =
    "2021-03-17\tb1f86b7f-67b8-45a8-926b-1699f0f7ccae\tERROR\tThere was an error when fetching data from CAPI";
  const expected = {
    level: "ERROR",
    message: "There was an error when fetching data from CAPI",
    lambdaRequestId: "b1f86b7f-67b8-45a8-926b-1699f0f7ccae",
  };
  expect(parseLambdaLogLine(logGroup, logLine)).toStrictEqual(expected);
});

test("Correctly identifies and returns parsed custom log lines", () => {
  const logGroup = "/aws/lambda/app-name-PROD";
  const logLine = "There was an error when fetching data from CAPI";
  const expected = {
    message: logLine,
  };
  expect(parseLambdaLogLine(logGroup, logLine)).toStrictEqual(expected);
});

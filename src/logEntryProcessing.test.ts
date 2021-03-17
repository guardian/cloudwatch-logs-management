import { fieldValue, isRequestLogEntry } from './logEntryProcessing';

test('AWS Lambda Function reports are identified as request log entries', () => {
    const logLine = 'REPORT RequestId: b1f86b7f-67b8-45a8-926b-1699f0f7ccae\tDuration: 1028.81 ms\tBilled Duration: 1029 ms\tMemory Size: 1024 MB\tMax Memory Used: 220 MB\t';
    expect(isRequestLogEntry(logLine)).toBe(true)
})

test('Custom log lines are not identified as request log entries', () => {
    const logLine = 'There was an error when fetching data from CAPI';
    expect(isRequestLogEntry(logLine)).toBe(false)
})

test('Extracts a request ID correctly', () => {
    const logLine = 'REPORT RequestId: b1f86b7f-67b8-45a8-926b-1699f0f7ccae\tDuration: 1028.81 ms\tBilled Duration: 1029 ms\tMemory Size: 1024 MB\tMax Memory Used: 220 MB\t';
    const expected = 'b1f86b7f-67b8-45a8-926b-1699f0f7ccae';
    expect(fieldValue(logLine, 'RequestId', 36)).toBe(expected)
})

test('Extracts version correctly', () => {
    const logLine = 'START RequestId: b1f86b7f-67b8-45a8-926b-1699f0f7ccae Version: $LATEST';
    const expected = '$LATEST';
    expect(fieldValue(logLine, 'Version')).toBe(expected)
})
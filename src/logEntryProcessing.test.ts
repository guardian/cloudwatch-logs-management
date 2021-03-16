import { isRequestLogEntry } from './logEntryProcessing';

test('AWS Lambda Function reports are identified as request log entries', () => {
    const logLine = "REPORT RequestId: 6fcf3b62-bdcb-4fd1-a8ac-4388dfd4784c Duration: 803.21 ms Billed Duration: 804 ms Memory Size: 256 MB Max Memory Used: 219 MB"
    expect(isRequestLogEntry(logLine)).toBe(true)
})

test('Custom log lines are not identified as request log entries', () => {
    const logLine = "There was an error when fetching data from CAPI"
    expect(isRequestLogEntry(logLine)).toBe(false)
})
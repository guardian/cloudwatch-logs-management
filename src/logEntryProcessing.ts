export function isRequestLogEntry(line: string): boolean {
    return line.startsWith('START RequestId: ') ||
        line.startsWith('END RequestId: ') ||
        line.startsWith('REPORT RequestId: ')
}
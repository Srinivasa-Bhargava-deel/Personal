# Logging Config Future Updates

This document tracks features in the current LoggingConfig.ts that are not present in v1.9.5.1.

## Comparison: Current (v1.9.6) vs v1.9.5.1

### New Features in Current Version

#### 1. Enhanced `processWriteQueue()` Error Handling
**Current Version:**
- Uses callback-based error handling with `(err?: Error | null)` parameter
- Continues processing queue after write completes via callback
- Handles drain events for buffer-full scenarios
- More robust error recovery

**v1.9.5.1:**
- Simpler callback without explicit error parameter
- Less robust error handling

#### 2. LOG_FILE_NAME Constant
**Current Version:**
- Added `private static readonly LOG_FILE_NAME = 'logs.txt'` constant
- Replaced hardcoded `'logs.txt'` strings with `LoggingConfig.LOG_FILE_NAME`
- Better maintainability and consistency

**v1.9.5.1:**
- Hardcoded `'logs.txt'` string in `path.join(vscodeDir, 'logs.txt')`

#### 3. Enhanced `initializeFileLogging()` Documentation
**Current Version:**
- Updated documentation to reference `LOG_FILE_NAME` constant
- More descriptive comments

**v1.9.5.1:**
- Basic documentation with hardcoded path reference

### Features Present in Both Versions

- File logging to `.vscode/logs.txt`
- Console interception (console.log/error/warn)
- Write queue mechanism for async logging
- Log level system (VERBOSE, DETAILED, NORMAL, MINIMAL)
- Module-specific logging flags
- Section/subsection/table logging methods
- Raw logging method
- Test validation logging
- Enable/disable all logging methods

### Migration Notes

When updating from v1.9.5.1 to current version:

1. **No breaking changes** - All existing functionality is preserved
2. **New constant** - `LOG_FILE_NAME` can be used for consistency
3. **Improved error handling** - Better resilience in `processWriteQueue()`

### Future Enhancements (Not Yet Implemented)

These are potential future improvements that could be added:

1. **Log Rotation**: Automatic log file rotation when size exceeds threshold
2. **Log Compression**: Compress old log files
3. **Log Filtering**: Filter logs by module/level at runtime
4. **Performance Metrics**: Track logging performance overhead
5. **Remote Logging**: Option to send logs to remote server
6. **Structured Logging**: JSON format option for easier parsing
7. **Log Retention Policy**: Automatic cleanup of old logs


# Validation: test_security_vulnerabilities.cpp

## Test File Purpose
Tests security vulnerability detection including SQL injection, buffer overflow, format string vulnerabilities, etc.

## Expected Behavior

### Vulnerability Detection
- SQL injection: Tainted input in SQL queries
- Buffer overflow: Tainted input in buffer operations
- Format string: Tainted input in printf/format functions
- Command injection: Tainted input in system/exec calls
- Path traversal: Tainted input in file operations

## Expected Logs

```
[SecurityAnalyzer] ⚠️ VULNERABILITY: SQL Injection detected
[SecurityAnalyzer] ⚠️ VULNERABILITY: Buffer Overflow detected
[SecurityAnalyzer] ⚠️ VULNERABILITY: Format String vulnerability detected
```

## Expected UI Output

### Taint Analysis Tab
- Vulnerabilities should be listed with severity
- Attack paths should be shown
- Source to sink paths should be highlighted

### CFG Tab
- Vulnerable blocks should be highlighted
- Attack paths should be visible

## Validation Checklist

- [ ] SQL injection vulnerabilities are detected
- [ ] Buffer overflow vulnerabilities are detected
- [ ] Format string vulnerabilities are detected
- [ ] Command injection vulnerabilities are detected
- [ ] Path traversal vulnerabilities are detected
- [ ] Attack paths are shown correctly


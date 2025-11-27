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

## Counterexamples Added

### Counterexample 1: Format String Vulnerability with snprintf
- **Purpose**: Tests format string vulnerability detection with snprintf
- **Expected**: Should detect vulnerability if size is too large
- **Edge Case**: snprintf format string vulnerability

### Counterexample 2: Use-After-Free with Dangling Pointer in Loop
- **Purpose**: Tests use-after-free detection with dangling pointers
- **Expected**: Should detect use-after-free vulnerability
- **Edge Case**: Dangling pointer use-after-free

### Counterexample 3: Double-Free with Pointer Alias
- **Purpose**: Tests double-free detection with pointer aliases
- **Expected**: Should detect double-free vulnerability
- **Edge Case**: Pointer alias double-free

### Counterexample 4: Integer Overflow Leading to Heap Buffer Overflow
- **Purpose**: Tests integer overflow detection leading to buffer overflow
- **Expected**: Should detect integer overflow vulnerability
- **Edge Case**: Integer overflow buffer overflow

### Counterexample 5: Path Traversal Vulnerability with system Command
- **Purpose**: Tests path traversal detection with system command
- **Expected**: Should detect path traversal vulnerability
- **Edge Case**: Path traversal with system

## Validation Checklist

- [ ] SQL injection vulnerabilities are detected
- [ ] Buffer overflow vulnerabilities are detected
- [ ] Format string vulnerabilities are detected
- [ ] Command injection vulnerabilities are detected
- [ ] Path traversal vulnerabilities are detected
- [ ] Attack paths are shown correctly
- [ ] snprintf format string vulnerabilities are detected
- [ ] Use-after-free vulnerabilities are detected
- [ ] Double-free vulnerabilities are detected
- [ ] Integer overflow vulnerabilities are detected
- [ ] Path traversal with system is detected

## Notes
- Counterexamples test edge cases for security vulnerability detection


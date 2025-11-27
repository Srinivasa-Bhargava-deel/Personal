# Test Validation: Registry Edge Cases

**Test File**: `tests/test_registry_edge_cases.cpp`

## Purpose

This test validates edge cases for TaintSourceRegistry, TaintSinkRegistry, and SanitizationRegistry:
- Multi-category functions (source AND sink)
- Custom registry entries
- Argument extraction edge cases
- Pattern matching edge cases
- Registry lookup edge cases
- Category-specific analysis
- Severity levels
- Sanitization types

## Expected Behavior

### Test 1: Multi-Category Functions
- **Expected**: Functions detected as both source and sink
- **Examples**:
  - `scanf`: user_input source, buffer sink
  - `sprintf`: format_string sink, buffer sink, SQL sink
  - `gets`: user_input source, buffer sink
- **Log**: Should show multi-category detection

### Test 2: Taint Source Registry - Argument Index Edge Cases
- **Expected**: Different argument indices handled correctly
- **argumentIndex = -1**: Return value is tainted (getenv)
- **argumentIndex = 0**: First argument tainted (gets)
- **argumentIndex = 1**: Second argument tainted (scanf, read)
- **Log**: Should show correct argument extraction

### Test 3: Taint Sink Registry - Multiple Argument Indices
- **Expected**: Sinks with multiple argument indices handled
- **sprintf**: argumentIndices = [0, 1] (format and arguments)
- **snprintf**: argumentIndices = [2] (format string)
- **Log**: Should show multiple argument checking

### Test 4: Sanitization Registry - Taint Removal Edge Cases
- **Expected**: Taint removal behavior correct
- **removesTaint = true**: Encoding, escaping functions remove taint
- **removesTaint = false**: Validation, length limit functions don't remove taint
- **Log**: Should show taint removal decisions

### Test 5: Registry Pattern Matching Edge Cases
- **Expected**: Pattern matching handles variations
- **Whitespace**: Various spacing patterns matched
- **Format variations**: Different call formats matched
- **Log**: Should show pattern matching results

### Test 6: Custom Registry Entries
- **Expected**: Custom sources/sinks/sanitizers work
- **Custom sources**: Should be detected
- **Custom sinks**: Should be detected
- **Custom sanitizers**: Should be detected
- **Log**: Should show custom registry usage

### Test 7: Argument Extraction Edge Cases
- **Expected**: Complex argument extraction works
- **Nested calls**: `helper(helper(x))` extracted correctly
- **Complex expressions**: `helper(x + y)` extracted correctly
- **Pointers/arrays**: `*ptr`, `arr[x]` extracted correctly
- **Log**: Should show argument extraction details

### Test 8: Registry Lookup Edge Cases
- **Expected**: Lookup handles variations
- **Case sensitivity**: Should match correctly
- **Function name variations**: Should match
- **Missing functions**: Should not crash
- **Log**: Should show lookup results

### Test 9: Taint Source Category Edge Cases
- **Expected**: Multi-category sources handled
- **read()**: Can be user_input, file_io, or network
- **fgets()**: Can be user_input or file_io
- **Log**: Should show category detection

### Test 10: Taint Sink Severity Edge Cases
- **Expected**: Severity levels handled correctly
- **Critical**: system, sprintf (command injection, buffer overflow)
- **High**: printf, fopen (format string, path traversal)
- **Medium**: Various medium severity sinks
- **Log**: Should show severity assessment

### Test 11: Sanitization Type Edge Cases
- **Expected**: Different sanitization types identified
- **Validation**: isalnum, isdigit (removesTaint = false)
- **Encoding**: url_encode, htmlspecialchars (removesTaint = true)
- **Escaping**: sql_escape, shell_escape (removesTaint = true)
- **Length limit**: strncpy, snprintf (removesTaint = false)
- **Log**: Should show sanitization type detection

### Test 12: Registry Performance Edge Cases
- **Expected**: Performance is acceptable
- **Many calls**: Should be fast (O(1) lookup)
- **Large registries**: Should not slow down
- **Log**: Should show performance is acceptable

## Expected Logs

```
[TaintSourceRegistry] Detected taint source: scanf (category: user_input, argumentIndex: 1)
[TaintSinkRegistry] Detected taint sink: sprintf (category: format_string, severity: high, argumentIndices: [0, 1])
[SanitizationRegistry] Detected sanitization: url_encode (type: encoding, removesTaint: true)
```

## Expected UI Output

### Taint Analysis
- Multi-category functions should show both source and sink properties
- Custom registry entries should work correctly
- Argument extraction should be accurate

### Vulnerability Detection
- Multi-category functions should trigger appropriate vulnerability checks
- Severity levels should be correctly assigned
- Sanitization should prevent false positives

## Validation Checklist

- [ ] Multi-category functions detected correctly
- [ ] Argument index edge cases handled
- [ ] Multiple argument indices handled
- [ ] Taint removal behavior correct
- [ ] Pattern matching handles variations
- [ ] Custom registry entries work
- [ ] Argument extraction handles edge cases
- [ ] Registry lookup handles variations
- [ ] Category-specific analysis works
- [ ] Severity levels assigned correctly
- [ ] Sanitization types identified correctly
- [ ] Performance is acceptable
- [ ] No crashes on edge cases

## Notes

- Registries are critical for taint analysis accuracy
- Edge cases must not cause crashes
- Multi-category functions require special handling
- Custom registry entries enable extensibility
- Performance is important for large codebases


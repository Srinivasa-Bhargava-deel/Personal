# Validation: test_arithmetic_taint.cpp

## Test File Purpose
Tests taint propagation through arithmetic expressions (n-1, n+1, n*2, etc.) and inter-procedural propagation.

## Test Code Structure
- `get_user_number()`: Taint source via scanf
- `process_number(int n)`: Tests arithmetic operations with tainted input
- `helper_function(int x)`: Tests parameter taint propagation
- `fibonacci(int n)`: Tests recursive calls with arithmetic
- `main()`: Orchestrates all tests

## Expected Behavior

### Taint Propagation
- **Arithmetic expressions**: `n-1`, `n+1`, `n*2` should propagate taint
- **Parameter passing**: `n-1` passed to function should propagate taint
- **Recursive calls**: `fibonacci(n-1)` and `fibonacci(n-2)` should propagate taint
- **Multiple operations**: `user_input + 5 - 2` should propagate taint

### Functions
- `get_user_number()`: `n` is tainted from scanf
- `process_number()`: All `result1-4` should be tainted
- `helper_function()`: `x` should be tainted if called with tainted value
- `fibonacci()`: Return value should be tainted if `n` is tainted
- `main()`: `user_input`, `processed`, `fib`, `result` should all be tainted

## Expected Logs

### Taint Analysis Logs
```
[TaintAnalysis] [SOURCE] 🔴 Taint source detected: n <- scanf (user_input)
[TaintAnalysis] [PROPAGATION] ✅ Forward propagation: result1 <- n (arithmetic: n-1)
[TaintAnalysis] [PROPAGATION] ✅ Forward propagation: result2 <- n (arithmetic: n+1)
[TaintAnalysis] [PROPAGATION] ✅ Forward propagation: result3 <- n (arithmetic: n*2)
[TaintAnalysis] [IPA] Parameter taint: x <- n (process_number -> helper_function)
```

### Inter-Procedural Analysis Logs
```
[IPA] Parameter taint detected: helper_function.x <- process_number.n-1
[IPA] Return value taint: fibonacci <- n (recursive propagation)
```

## Expected UI Output

### CFG Tab
- **Functions**: 5 functions
- **Tainted Blocks**: Multiple blocks per function showing arithmetic propagation
- **Data-flow Edges**: Should show taint flow through arithmetic operations

### Taint Analysis Tab
- **Tainted Variables**:
  - `n` (source: scanf in get_user_number)
  - `result1`, `result2`, `result3`, `result4` (in process_number)
  - `x` (in helper_function, if called with tainted value)
  - `user_input`, `processed`, `fib`, `result` (in main)

### Inter-Procedural Taint Tab
- **Parameter Taint**: `helper_function.x` from `process_number.n-1`
- **Return Value Taint**: `fibonacci` return values

### Interconnected CFG Tab
- **Data-flow Taint**: Multiple blocks showing arithmetic propagation
- **Function Call Edges**: Should show calls between functions
- **Data Flow Edges**: Should show taint flow through parameters/returns

## Validation Checklist

- [ ] Arithmetic expressions (`n-1`, `n+1`, `n*2`) propagate taint correctly
- [ ] Parameter taint propagation works (`n-1` -> `helper_function.x`)
- [ ] Recursive calls propagate taint (`fibonacci(n-1)`, `fibonacci(n-2)`)
- [ ] Multiple arithmetic operations propagate taint (`user_input + 5 - 2`)
- [ ] Inter-procedural taint analysis shows parameter flows
- [ ] Return value taint analysis shows recursive propagation
- [ ] All functions appear in visualization
- [ ] Data flow edges show taint propagation paths

## Counterexamples Added

### Counterexample 1: Division and Modulo Operations
- **Purpose**: Tests taint propagation through `/` and `%` operations
- **Expected**: `quotient` and `remainder` should be tainted from `dividend` and `divisor`
- **Edge Case**: Division/modulo operations

### Counterexample 2: Bitwise Arithmetic Operations
- **Purpose**: Tests taint propagation through bitwise operations (`&`, `|`, `^`, `<<`, `>>`)
- **Expected**: All bitwise operation results should be tainted
- **Edge Case**: Bitwise arithmetic operations

### Counterexample 3: Compound Assignment Operators
- **Purpose**: Tests taint propagation through `+=`, `-=`, `*=`, `/=`
- **Expected**: Variables modified with compound assignments should be tainted
- **Edge Case**: Compound assignment operators

### Counterexample 4: Long Arithmetic Expression Chain
- **Purpose**: Tests taint propagation through complex arithmetic chains
- **Expected**: Final result should be tainted through entire chain
- **Edge Case**: Complex expression chains

### Counterexample 5: Arithmetic in Conditional Expression
- **Purpose**: Tests taint propagation when arithmetic is used in conditions
- **Expected**: Result should be tainted from arithmetic in condition
- **Edge Case**: Arithmetic in conditionals

## Notes
- Tests basic arithmetic taint propagation
- Tests inter-procedural taint through parameters
- Tests recursive taint propagation
- Should work with all sensitivity levels
- Counterexamples test edge cases: division/modulo, bitwise, compound assignments, chains, conditionals


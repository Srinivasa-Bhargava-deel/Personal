# Validation: test_taint_rd.cpp

## Test File Purpose
Tests that taint analysis receives Reaching Definitions (RD) info for all blocks and correctly propagates taint through simple data flow.

## Test Code Structure
```cpp
int main() {
    int x;
    scanf("%d", &x);  // Taint source - block 1
    
    int y = x;         // Taint propagation - block 2
    int z = y + 1;     // More propagation - block 3
    
    printf("%d", z);   // Taint sink - block 4 (should detect vulnerability)
    return 0;
}
```

## Expected Behavior

### Taint Analysis
- **Block 1**: `x` is tainted (source: `scanf`)
- **Block 2**: `y` is tainted (propagated from `x`)
- **Block 3**: `z` is tainted (propagated from `y`)
- **Block 4**: Vulnerability detected - tainted `z` flows to `printf` sink

### Reaching Definitions
- **Block 2**: RD should show `x` definition from block 1 reaches here
- **Block 3**: RD should show `y` definition from block 2 reaches here
- **Block 4**: RD should show `z` definition from block 3 reaches here

### Visualization
- **CFG**: Should show 4-5 blocks (entry, scanf, assignments, printf, exit)
- **Taint Colors**: Blocks 1-3 should be yellow (data-flow taint)
- **Vulnerability**: Should appear in Taint Analysis tab

## Expected Logs

### Taint Analysis Logs
```
[TaintAnalysis] [SOURCE] 🔴 Taint source detected: x <- scanf (user_input)
[TaintAnalysis] [PROPAGATION] ✅ Forward propagation: y <- x (block 2)
[TaintAnalysis] [PROPAGATION] ✅ Forward propagation: z <- y (block 3)
[TaintAnalysis] [SINK] ⚠️ Taint sink detected: printf (z) - VULNERABILITY
```

### Reaching Definitions Logs
```
[RD] Block 2 IN: {x: [block1_stmt1]}
[RD] Block 2 OUT: {x: [block1_stmt1], y: [block2_stmt1]}
[RD] Block 3 IN: {x: [block1_stmt1], y: [block2_stmt1]}
[RD] Block 3 OUT: {x: [block1_stmt1], y: [block2_stmt1], z: [block3_stmt1]}
```

## Expected UI Output

### CFG Tab
- **Total Blocks**: 4-5 blocks
- **Tainted Blocks**: 3 blocks (blocks with x, y, z)
- **Vulnerability Count**: 1 vulnerability

### Taint Analysis Tab
- **Tainted Variables**: 
  - `x` (source: scanf)
  - `y` (source: scanf, propagated from x)
  - `z` (source: scanf, propagated from y)
- **Vulnerabilities**:
  - Format string vulnerability: `printf("%d", z)` where `z` is tainted

### Interconnected CFG Tab
- **Data-flow Taint**: 3 blocks
- **Normal Blocks**: 1-2 blocks (entry/exit)
- **Data Flow Edges**: 2 edges (x→y, y→z)

## Validation Checklist

- [ ] `x` is marked as tainted from `scanf`
- [ ] `y` is marked as tainted (propagated from `x`)
- [ ] `z` is marked as tainted (propagated from `y`)
- [ ] Vulnerability is detected for `printf("%d", z)`
- [ ] RD analysis shows correct definition propagation
- [ ] CFG visualization shows correct block colors
- [ ] Taint Analysis tab shows all 3 tainted variables
- [ ] Vulnerability appears in Taint Analysis tab

## Notes
- This is a simple test case to verify basic taint propagation
- Should work with all sensitivity levels (MINIMAL and above)
- No control-dependent taint expected (no conditionals)


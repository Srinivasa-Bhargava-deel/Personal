# DRY RUN ANALYSIS: Expected Values for Each Sensitivity Level

## Test File: `test_control_dependent_taint.cpp`

### File Structure Analysis

**Functions:**
- `main()` - Contains 6 test cases with various control structures
- `get_user_input()` - Taint source (scanf)
- `process_data(int value)` - Receives tainted parameter

**Total Functions:** 3

**Control Structures:**
1. Simple if-else (lines 14-21)
2. Nested if-statements (lines 26-33)
3. While loop (lines 38-43)
4. For loop (lines 48-52)
5. Switch statement (lines 57-73)
6. Mixed data-flow + control-dependent (lines 79-83)

**Taint Sources:**
- `get_user_input()` called 6 times in `main()`
- `scanf("%d", &value)` in `get_user_input()`

**Taint Sinks:**
- `printf()` called 8 times (all vulnerable if taint reaches them)

---

## Expected Values by Sensitivity Level

### MINIMAL Sensitivity

**Features Enabled:**
- ✅ Data-flow taint propagation only
- ❌ NO control-dependent taint
- ❌ NO inter-procedural taint
- ❌ NO recursive propagation
- ❌ NO path-sensitive analysis
- ❌ NO field-sensitive analysis
- ❌ NO context-sensitive analysis
- ❌ NO flow-sensitive analysis

**Expected Taint Variables:**
- `user_input` (from `get_user_input()`)
- `tainted_var` (from `get_user_input()`)
- `loop_var` (from `get_user_input()`)
- `limit` (from `get_user_input()`)
- `choice` (from `get_user_input()`)
- `data_tainted` (from `get_user_input()`)
- `derived` (from `data_tainted * 2`)
- `value` (parameter in `process_data`)

**Expected Control-Dependent Taint Variables:** 0 (NONE - feature disabled)

**Expected Mixed Taint Variables:** 0 (NONE - no control-dependent taint)

**Expected Vulnerabilities:**
- Only vulnerabilities where data-flow taint reaches sinks directly
- Should NOT include control-dependent vulnerabilities

**Expected Counts:**
- **Total Functions:** 3
- **CFG Nodes (main):** ~15-20 blocks (depends on CFG generation)
- **CFG Edges (main):** ~20-25 edges
- **Data-flow Taint Blocks:** ~8-10 blocks (blocks containing tainted variables)
- **Control-dependent Taint Blocks:** 0
- **Mixed Taint Blocks:** 0
- **Total Tainted Blocks:** ~8-10
- **Data-flow Edges (Orange):** ~8-12 edges
- **Control Flow Edges (Green):** ~20-25 edges
- **Function Call Edges (Blue):** ~6 edges (6 calls to `get_user_input()`)

---

### CONSERVATIVE Sensitivity

**Features Enabled:**
- ✅ Data-flow taint propagation
- ✅ Basic control-dependent taint (direct branches only)
- ❌ NO nested control-dependent taint
- ❌ NO inter-procedural taint
- ❌ NO recursive propagation
- ❌ NO path-sensitive analysis
- ❌ NO field-sensitive analysis
- ❌ NO context-sensitive analysis
- ❌ NO flow-sensitive analysis

**Expected Taint Variables:**
- All from MINIMAL +
- `x`, `y` (from Test 1: simple if)
- `z` (from Test 1: else branch)
- `a` (from Test 2: outer if)
- `counter` (from Test 3: while loop)
- `sum` (from Test 4: for loop)
- `result1`, `result2`, `result3` (from Test 5: switch)
- `control_tainted` (from Test 6: if branch)
- `processed` (from `process_data` if branch)

**Expected Control-Dependent Taint Variables:** ~10-12 variables

**Expected Mixed Taint Variables:** 
- `mixed` (from Test 6: combines `derived` + `control_tainted`)

**Expected Vulnerabilities:**
- All vulnerabilities including control-dependent ones
- Should include all 8 printf sinks

**Expected Counts:**
- **Total Functions:** 3
- **CFG Nodes (main):** ~15-20 blocks
- **CFG Edges (main):** ~20-25 edges
- **Data-flow Taint Blocks:** ~8-10 blocks
- **Control-dependent Taint Blocks:** ~10-15 blocks (direct branches only, no nested)
- **Mixed Taint Blocks:** ~1-2 blocks
- **Total Tainted Blocks:** ~18-25 blocks
- **Data-flow Edges (Orange):** ~15-20 edges
- **Control Flow Edges (Green):** ~20-25 edges
- **Function Call Edges (Blue):** ~6 edges

---

### BALANCED Sensitivity

**Features Enabled:**
- ✅ Data-flow taint propagation
- ✅ Full control-dependent taint (including nested)
- ✅ Recursive control-dependent propagation
- ✅ Inter-procedural taint propagation
- ❌ NO path-sensitive analysis
- ❌ NO field-sensitive analysis
- ❌ NO context-sensitive analysis
- ❌ NO flow-sensitive analysis

**Expected Taint Variables:**
- All from CONSERVATIVE +
- `b` (from Test 2: nested if - should be control-dependent from BOTH outer and inner conditionals)

**Expected Control-Dependent Taint Variables:** ~11-13 variables (includes nested)

**Expected Mixed Taint Variables:** 
- `mixed` (from Test 6)

**Expected Vulnerabilities:**
- All 8 printf sinks should be vulnerable
- Inter-procedural vulnerabilities if taint flows through function calls

**Expected Counts:**
- **Total Functions:** 3
- **CFG Nodes (main):** ~15-20 blocks
- **CFG Edges (main):** ~20-25 edges
- **Data-flow Taint Blocks:** ~8-10 blocks
- **Control-dependent Taint Blocks:** ~12-18 blocks (includes nested structures)
- **Mixed Taint Blocks:** ~1-2 blocks
- **Total Tainted Blocks:** ~20-28 blocks
- **Data-flow Edges (Orange):** ~20-30 edges (includes inter-procedural)
- **Control Flow Edges (Green):** ~20-25 edges
- **Function Call Edges (Blue):** ~6 edges

---

### PRECISE Sensitivity

**Features Enabled:**
- ✅ Data-flow taint propagation
- ✅ Full control-dependent taint (including nested)
- ✅ Recursive control-dependent propagation
- ✅ Inter-procedural taint propagation
- ✅ Path-sensitive analysis (reduces false positives)
- ✅ Field-sensitive analysis
- ❌ NO context-sensitive analysis
- ❌ NO flow-sensitive analysis

**Expected Taint Variables:**
- Similar to BALANCED, but path-sensitive analysis may reduce some false positives
- Field-sensitive analysis tracks struct fields separately

**Expected Control-Dependent Taint Variables:** ~11-13 variables (may be slightly fewer due to path-sensitivity)

**Expected Mixed Taint Variables:** 
- `mixed` (from Test 6)

**Expected Vulnerabilities:**
- All 8 printf sinks should be vulnerable
- May have fewer false positives than BALANCED

**Expected Counts:**
- **Total Functions:** 3
- **CFG Nodes (main):** ~15-20 blocks
- **CFG Edges (main):** ~20-25 edges
- **Data-flow Taint Blocks:** ~8-10 blocks
- **Control-dependent Taint Blocks:** ~10-16 blocks (path-sensitive may reduce some)
- **Mixed Taint Blocks:** ~1-2 blocks
- **Total Tainted Blocks:** ~18-26 blocks
- **Data-flow Edges (Orange):** ~18-28 edges
- **Control Flow Edges (Green):** ~20-25 edges
- **Function Call Edges (Blue):** ~6 edges

---

### MAXIMUM Sensitivity

**Features Enabled:**
- ✅ Data-flow taint propagation
- ✅ Full control-dependent taint (including nested)
- ✅ Recursive control-dependent propagation
- ✅ Inter-procedural taint propagation
- ✅ Path-sensitive analysis
- ✅ Field-sensitive analysis
- ✅ Context-sensitive analysis (k-limited)
- ✅ Flow-sensitive analysis (statement order awareness)

**Expected Taint Variables:**
- Similar to PRECISE, but context-sensitive and flow-sensitive may add more precision
- Context-sensitive tracks different calling contexts separately
- Flow-sensitive considers statement order

**Expected Control-Dependent Taint Variables:** ~11-13 variables

**Expected Mixed Taint Variables:** 
- `mixed` (from Test 6)

**Expected Vulnerabilities:**
- All 8 printf sinks should be vulnerable
- Maximum precision with context and flow sensitivity

**Expected Counts:**
- **Total Functions:** 3
- **CFG Nodes (main):** ~15-20 blocks
- **CFG Edges (main):** ~20-25 edges
- **Data-flow Taint Blocks:** ~8-10 blocks
- **Control-dependent Taint Blocks:** ~10-16 blocks
- **Mixed Taint Blocks:** ~1-2 blocks
- **Total Tainted Blocks:** ~18-26 blocks
- **Data-flow Edges (Orange):** ~18-30 edges (may include more due to context/flow sensitivity)
- **Control Flow Edges (Green):** ~20-25 edges
- **Function Call Edges (Blue):** ~6 edges

---

## Key Validation Points

### MINIMAL vs Others
- **MINIMAL** should have **0 control-dependent taint blocks**
- **CONSERVATIVE+** should have **>0 control-dependent taint blocks**

### CONSERVATIVE vs BALANCED
- **CONSERVATIVE** should NOT have nested control-dependent taint (e.g., `b` in Test 2)
- **BALANCED+** should have nested control-dependent taint

### BALANCED vs PRECISE
- **PRECISE** may have slightly fewer tainted blocks due to path-sensitivity
- Both should have inter-procedural taint

### PRECISE vs MAXIMUM
- **MAXIMUM** should have context-sensitive and flow-sensitive features enabled
- May have more precise taint tracking due to context awareness

---

## Validation Checklist

For each sensitivity level, verify:

1. ✅ Correct feature flags are enabled/disabled
2. ✅ Control-dependent taint count matches expectations
3. ✅ Data-flow taint count matches expectations
4. ✅ Mixed taint count matches expectations
5. ✅ Edge counts (green/blue/orange) match expectations
6. ✅ Node counts match expectations
7. ✅ Function counts match expectations
8. ✅ Vulnerabilities match expectations

---

## Notes

- Actual counts may vary slightly due to CFG generation differences
- Edge counts depend on how data-flow edges are calculated
- Control-dependent blocks depend on control dependency analysis precision
- Inter-procedural edges depend on call graph construction



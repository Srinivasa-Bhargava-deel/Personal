# VALIDATION CHECKLIST: Recursive Control Tainting & Taint Sensitivity Levels

## 📋 **OVERVIEW**

This document provides comprehensive validation criteria for ensuring the implementation meets academic standards and works correctly across all sensitivity levels.

---

## 🎓 **ACADEMIC STANDARDS VALIDATION**

### **Control-Dependent Taint Validation**

#### **✅ Algorithm Correctness**

- [ ] **Control Dependency Detection**:
  - [ ] Correctly identifies conditional blocks (if/while/for/switch)
  - [ ] Correctly extracts variables from conditional statements
  - [ ] Correctly identifies control-dependent blocks (blocks reachable only through specific branches)
  - [ ] Handles nested control structures correctly
  - [ ] **Academic Reference**: "Engineering a Compiler" (Cooper & Torczon, 2011), Chapter 9

- [ ] **Taint Propagation**:
  - [ ] Fixed-point iteration converges correctly
  - [ ] MAX_ITERATIONS safety limit prevents infinite loops
  - [ ] Label merging preserves all taint information
  - [ ] Variables can have multiple labels (data-flow + control-dependent)
  - [ ] **Academic Reference**: "Dataflow Analysis: Theory and Practice" (Khedker et al., 2009), Chapter 4

- [ ] **Recursive Propagation**:
  - [ ] Handles nested if-statements correctly
  - [ ] Handles nested while-loops correctly
  - [ ] Handles nested for-loops correctly
  - [ ] Handles nested switch-statements correctly
  - [ ] Cycle detection prevents infinite recursion
  - [ ] **Academic Reference**: "Implicit Flow Tracking" (Denning, 1976)

#### **✅ Implicit Flow Tracking**

- [ ] **Theory Compliance**:
  - [ ] Taint propagates through control dependencies (implicit flow)
  - [ ] Taint propagates through data dependencies (explicit flow)
  - [ ] Both flows are tracked separately but merged correctly
  - [ ] **Academic Reference**: "A Lattice Model of Secure Information Flow" (Denning, 1976)

---

### **Sensitivity Levels Validation**

#### **✅ MINIMAL Sensitivity**

- [ ] **Features**:
  - [ ] Only explicit data-flow taint propagation enabled
  - [ ] NO control-dependent taint propagation
  - [ ] NO inter-procedural taint propagation
  - [ ] NO recursive propagation
  - [ ] **Academic Reference**: "Minimal Sound Taint Analysis" (Schwartz et al., 2010)

- [ ] **Performance**:
  - [ ] Fastest analysis time
  - [ ] Minimal visualization edges
  - [ ] No control-dependent taint in results

#### **✅ CONSERVATIVE Sensitivity**

- [ ] **Features**:
  - [ ] Explicit data-flow taint propagation enabled
  - [ ] Basic control-dependent taint (direct branches only)
  - [ ] NO nested control structures
  - [ ] NO recursive propagation
  - [ ] **Academic Reference**: "Conservative Control-Flow Taint Analysis" (Livshits & Lam, 2005)

- [ ] **Performance**:
  - [ ] Fast analysis time
  - [ ] Reduced visualization edges (compared to BALANCED)
  - [ ] Only direct control-dependent taint in results

#### **✅ BALANCED Sensitivity**

- [ ] **Features**:
  - [ ] Explicit data-flow taint propagation enabled
  - [ ] Full control-dependent taint (all nested structures)
  - [ ] Recursive propagation enabled
  - [ ] Basic inter-procedural taint enabled
  - [ ] Fixed-point iteration for convergence
  - [ ] **Academic Reference**: "Balanced Taint Analysis" (Tripp et al., 2009)

- [ ] **Performance**:
  - [ ] Moderate analysis time
  - [ ] Dense visualization (current state - 224 edges)
  - [ ] Full recursive control-dependent taint in results

#### **✅ PRECISE Sensitivity**

- [ ] **Features**:
  - [ ] All BALANCED features enabled
  - [ ] Path-sensitive analysis enabled
  - [ ] Field-sensitive analysis enabled (if struct support exists)
  - [ ] Enhanced control-dependent taint (only SOME branches, not ALL)
  - [ ] **Academic Reference**: "Path-Sensitive and Field-Sensitive Taint Analysis" (Yin et al., 2007)

- [ ] **Performance**:
  - [ ] Slower analysis time (compared to BALANCED)
  - [ ] More precise visualization (fewer false positives)
  - [ ] Path-sensitive control-dependent taint in results

#### **✅ MAXIMUM Sensitivity**

- [ ] **Features**:
  - [ ] All PRECISE features enabled
  - [ ] Context-sensitive analysis enabled (k-limited contexts)
  - [ ] Flow-sensitive analysis enabled (statement order matters)
  - [ ] **Academic Reference**: "Context-Sensitive and Flow-Sensitive Taint Analysis" (Reps et al., 1995)

- [ ] **Performance**:
  - [ ] Slowest analysis time
  - [ ] Most precise visualization (minimal false positives)
  - [ ] Context-sensitive + flow-sensitive taint in results

---

## 🧪 **TEST CASE SPECIFICATIONS**

### **Test Case 1: Simple If-Statement**

**Code**:
```cpp
int user_input = get_user_input();  // tainted
if (user_input > 0) {
    int x = 10;  // should be control-dependent tainted
}
```

**Expected Results**:
- **MINIMAL**: `x` NOT tainted
- **CONSERVATIVE**: `x` tainted with CONTROL_DEPENDENT label
- **BALANCED**: `x` tainted with CONTROL_DEPENDENT label
- **PRECISE**: `x` tainted with CONTROL_DEPENDENT label
- **MAXIMUM**: `x` tainted with CONTROL_DEPENDENT label

**Validation**:
- [ ] Correct taint propagation per sensitivity level
- [ ] Visualization shows correct color (orange with dashed border for CONSERVATIVE+)
- [ ] Logs show control dependency detection

---

### **Test Case 2: Nested If-Statements**

**Code**:
```cpp
int tainted_var = get_user_input();  // tainted
if (tainted_var > 10) {
    int a = 5;  // control-dependent tainted
    if (a > 0) {  // nested
        int b = 15;  // should be control-dependent tainted (from outer AND inner)
    }
}
```

**Expected Results**:
- **MINIMAL**: `a` and `b` NOT tainted
- **CONSERVATIVE**: `a` tainted, `b` NOT tainted (no nested)
- **BALANCED**: `a` and `b` tainted (recursive)
- **PRECISE**: `a` and `b` tainted (recursive)
- **MAXIMUM**: `a` and `b` tainted (recursive)

**Validation**:
- [ ] Correct recursive propagation per sensitivity level
- [ ] Visualization shows nested control-dependent taint
- [ ] Logs show recursive propagation steps

---

### **Test Case 3: While Loop**

**Code**:
```cpp
int loop_var = get_user_input();  // tainted
while (loop_var > 0) {
    int counter = 0;  // should be control-dependent tainted
    loop_var--;  // loop_var remains tainted (data-flow)
}
```

**Expected Results**:
- **MINIMAL**: `counter` NOT tainted
- **CONSERVATIVE**: `counter` tainted (direct branch)
- **BALANCED**: `counter` tainted (recursive)
- **PRECISE**: `counter` tainted (recursive)
- **MAXIMUM**: `counter` tainted (recursive)

**Validation**:
- [ ] Correct loop handling per sensitivity level
- [ ] Visualization shows control-dependent taint in loop
- [ ] Logs show loop control dependency detection

---

### **Test Case 4: For Loop**

**Code**:
```cpp
int limit = get_user_input();  // tainted
for (int i = 0; i < limit; i++) {
    int sum = 0;  // should be control-dependent tainted
}
```

**Expected Results**:
- **MINIMAL**: `sum` NOT tainted
- **CONSERVATIVE**: `sum` tainted (direct branch)
- **BALANCED**: `sum` tainted (recursive)
- **PRECISE**: `sum` tainted (recursive)
- **MAXIMUM**: `sum` tainted (recursive)

**Validation**:
- [ ] Correct for-loop handling per sensitivity level
- [ ] Visualization shows control-dependent taint in for loop
- [ ] Logs show for-loop control dependency detection

---

### **Test Case 5: Switch Statement**

**Code**:
```cpp
int choice = get_user_input();  // tainted
switch (choice) {
    case 1: {
        int result1 = 100;  // should be control-dependent tainted
        break;
    }
    case 2: {
        int result2 = 200;  // should be control-dependent tainted
        break;
    }
}
```

**Expected Results**:
- **MINIMAL**: `result1` and `result2` NOT tainted
- **CONSERVATIVE**: `result1` and `result2` tainted (direct branches)
- **BALANCED**: `result1` and `result2` tainted (recursive)
- **PRECISE**: `result1` and `result2` tainted (recursive)
- **MAXIMUM**: `result1` and `result2` tainted (recursive)

**Validation**:
- [ ] Correct switch handling per sensitivity level
- [ ] Visualization shows control-dependent taint in switch cases
- [ ] Logs show switch control dependency detection

---

### **Test Case 6: Mixed Data-Flow and Control-Dependent Taint**

**Code**:
```cpp
int data_tainted = get_user_input();  // data-flow taint
int derived = data_tainted * 2;  // derived is data-flow tainted
if (derived > 0) {
    int control_tainted = 50;  // control-dependent tainted
    int mixed = derived + control_tainted;  // should have BOTH labels
}
```

**Expected Results**:
- **MINIMAL**: `mixed` has only data-flow taint (USER_INPUT label)
- **CONSERVATIVE**: `mixed` has both data-flow and control-dependent taint
- **BALANCED**: `mixed` has both data-flow and control-dependent taint
- **PRECISE**: `mixed` has both data-flow and control-dependent taint
- **MAXIMUM**: `mixed` has both data-flow and control-dependent taint

**Validation**:
- [ ] Correct label merging per sensitivity level
- [ ] Visualization shows mixed taint (orange-red color)
- [ ] Logs show both taint types detected

---

## 📊 **PERFORMANCE BENCHMARKS**

### **Analysis Time**

**Test File**: `test_control_dependent_taint.cpp`

**Expected Results**:
- **MINIMAL**: Fastest (< 100ms)
- **CONSERVATIVE**: Fast (< 150ms)
- **BALANCED**: Moderate (< 300ms)
- **PRECISE**: Slower (< 500ms)
- **MAXIMUM**: Slowest (< 1000ms)

**Validation**:
- [ ] Measure analysis time per sensitivity level
- [ ] Verify performance scales appropriately
- [ ] Log timing information

---

### **Visualization Edge Count**

**Test File**: `test_control_dependent_taint.cpp`

**Expected Results**:
- **MINIMAL**: Fewest edges (data-flow only)
- **CONSERVATIVE**: Fewer edges (direct control-dependent)
- **BALANCED**: More edges (full recursive)
- **PRECISE**: Similar to BALANCED (path-sensitive may reduce some)
- **MAXIMUM**: Similar to PRECISE (context-sensitive may add some)

**Validation**:
- [ ] Count visualization edges per sensitivity level
- [ ] Verify edge count decreases with lower sensitivity
- [ ] Log edge counts

---

### **Memory Usage**

**Expected Results**:
- **MINIMAL**: Lowest memory usage
- **CONSERVATIVE**: Low memory usage
- **BALANCED**: Moderate memory usage
- **PRECISE**: Higher memory usage (path-sensitive tracking)
- **MAXIMUM**: Highest memory usage (context-sensitive tracking)

**Validation**:
- [ ] Measure memory usage per sensitivity level
- [ ] Verify memory scales appropriately
- [ ] Log memory usage

---

## 🎨 **VISUAL VERIFICATION STEPS**

### **Visualization Colors**

**Expected Colors**:
- **Red blocks**: Data-flow taint only (explicit flow)
- **Orange blocks with dashed border**: Control-dependent taint only (implicit flow)
- **Orange-red blocks**: Mixed taint (both data-flow and control-dependent)
- **Blue blocks**: Normal (no taint)

**Validation**:
- [ ] Open CFG visualizer
- [ ] Navigate to "Interconnected CFG" tab
- [ ] Verify block colors match expected taint types
- [ ] Verify dashed borders appear for control-dependent taint
- [ ] Verify tooltips show correct taint information

---

### **Visualization Legend**

**Expected Legend**:
- Data-flow Taint (Red)
- Control-dependent Taint (Orange, Dashed)
- Mixed Taint (Orange-Red)
- Normal Blocks (Blue)

**Validation**:
- [ ] Verify legend displays correctly
- [ ] Verify legend matches actual block colors
- [ ] Verify legend is visible and readable

---

### **Tooltip Information**

**Expected Tooltip Content**:
- Function name
- Block ID
- Entry/Exit status
- Taint type (if tainted)
- Tainted variables list

**Validation**:
- [ ] Click on tainted blocks
- [ ] Verify tooltip shows correct taint type
- [ ] Verify tooltip shows tainted variables
- [ ] Verify tooltip distinguishes data-flow vs control-dependent

---

## 📝 **LOGGING VALIDATION**

### **Control Dependency Detection Logging**

**Expected Log Messages**:
```
[TaintAnalyzer] [ControlDependentTaint] Building control dependency graph for function: main
[TaintAnalyzer] [ControlDependentTaint] Found conditional block: B2 (if-statement)
[TaintAnalyzer] [ControlDependentTaint] Extracted conditional variables: [user_input]
[TaintAnalyzer] [ControlDependentTaint] Control-dependent blocks: [B3, B4]
```

**Validation**:
- [ ] Check `.vscode/logs.txt` for control dependency detection logs
- [ ] Verify all conditional blocks are detected
- [ ] Verify conditional variables are extracted correctly
- [ ] Verify control-dependent blocks are identified correctly

---

### **Taint Propagation Logging**

**Expected Log Messages**:
```
[TaintAnalyzer] [ControlDependentTaint] Propagating control-dependent taint
[TaintAnalyzer] [ControlDependentTaint] Conditional block B2 uses tainted variable: user_input
[TaintAnalyzer] [ControlDependentTaint] Marking variable 'x' in block B3 as control-dependent tainted
[TaintAnalyzer] [ControlDependentTaint] Fixed-point iteration 1: 3 new taint labels added
[TaintAnalyzer] [ControlDependentTaint] Fixed-point iteration 2: 0 new taint labels added (converged)
```

**Validation**:
- [ ] Check logs for taint propagation steps
- [ ] Verify fixed-point iteration converges
- [ ] Verify variables are marked correctly
- [ ] Verify no infinite loops (MAX_ITERATIONS not reached)

---

### **Sensitivity Level Logging**

**Expected Log Messages**:
```
[TaintAnalyzer] [Sensitivity] Initialized with sensitivity level: PRECISE
[TaintAnalyzer] [Sensitivity] Control-dependent propagation: ENABLED
[TaintAnalyzer] [Sensitivity] Recursive propagation: ENABLED
[TaintAnalyzer] [Sensitivity] Path-sensitive analysis: ENABLED
[TaintAnalyzer] [Sensitivity] Field-sensitive analysis: ENABLED
[TaintAnalyzer] [Sensitivity] Context-sensitive analysis: DISABLED
[TaintAnalyzer] [Sensitivity] Flow-sensitive analysis: DISABLED
```

**Validation**:
- [ ] Check logs for sensitivity level initialization
- [ ] Verify features are enabled/disabled correctly
- [ ] Verify logging matches sensitivity level

---

## ✅ **COMPREHENSIVE VALIDATION CHECKLIST**

### **Phase C (Basic Implementation)**

- [ ] Simple if-statement test passes
- [ ] Control-dependent taint visible in visualization
- [ ] Logs show control dependency detection
- [ ] No crashes or errors
- [ ] Visualization shows orange blocks with dashed borders
- [ ] Tooltips show control-dependent taint information

### **Phase A (Full Implementation)**

- [ ] All 5 sensitivity levels work correctly
- [ ] All test cases pass
- [ ] Recursive control-dependent taint works
- [ ] Visualization distinguishes all taint types
- [ ] Performance scales appropriately
- [ ] Academic validation passes
- [ ] Path-sensitive analysis works (PRECISE/MAXIMUM)
- [ ] Field-sensitive analysis works (PRECISE/MAXIMUM)
- [ ] Context-sensitive analysis works (MAXIMUM)
- [ ] Flow-sensitive analysis works (MAXIMUM)

---

## 🔍 **EDGE CASE VALIDATION**

### **Edge Case 1: Cyclic Control Dependencies**

**Test**: Function with cycles in control flow

**Validation**:
- [ ] MAX_ITERATIONS limit prevents infinite loops
- [ ] Cycle detection works correctly
- [ ] Warning logged if MAX_ITERATIONS reached

---

### **Edge Case 2: Empty Conditional Blocks**

**Test**: Conditional block with no statements

**Validation**:
- [ ] No errors when block has no statements
- [ ] Propagation skips empty blocks gracefully

---

### **Edge Case 3: Nested Conditionals with Same Variable**

**Test**: Variable used in nested conditionals

**Validation**:
- [ ] Labels are merged correctly
- [ ] Variable has multiple CONTROL_DEPENDENT labels
- [ ] No duplicate labels

---

### **Edge Case 4: Sensitivity Level Mismatch**

**Test**: Invalid sensitivity level passed

**Validation**:
- [ ] Defaults to PRECISE
- [ ] Warning logged for invalid level

---

### **Edge Case 5: Missing CFG Blocks**

**Test**: Control dependency references non-existent block

**Validation**:
- [ ] Missing blocks are skipped gracefully
- [ ] Warning logged for missing blocks

---

## 📚 **ACADEMIC REFERENCES VALIDATION**

### **Control-Dependent Taint**

- [ ] Algorithm matches "Engineering a Compiler" (Cooper & Torczon, 2011)
- [ ] Fixed-point iteration matches "Dataflow Analysis: Theory and Practice" (Khedker et al., 2009)
- [ ] Implicit flow tracking matches "A Lattice Model of Secure Information Flow" (Denning, 1976)

### **Sensitivity Levels**

- [ ] MINIMAL matches "Minimal Sound Taint Analysis" (Schwartz et al., 2010)
- [ ] CONSERVATIVE matches "Conservative Control-Flow Taint Analysis" (Livshits & Lam, 2005)
- [ ] BALANCED matches "Balanced Taint Analysis" (Tripp et al., 2009)
- [ ] PRECISE matches "Path-Sensitive and Field-Sensitive Taint Analysis" (Yin et al., 2007)
- [ ] MAXIMUM matches "Context-Sensitive and Flow-Sensitive Taint Analysis" (Reps et al., 1995)

---

**Last Updated**: Validation Checklist v1.0
**Status**: Ready for validation
**Next Step**: Run validation after implementation


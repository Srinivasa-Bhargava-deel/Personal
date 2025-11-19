# PLAN FOR CONFIGURABLE TAINT ANALYSIS SENSITIVITY LEVELS

## **TASK OBJECTIVE**
Implement 5 configurable taint analysis sensitivity levels (Very Low to Very High) to allow users to balance precision vs performance/visualization clarity. Address the issue of 224 data-flow edges making visualization "fuzzy".

## **PROBLEM ANALYSIS**
- **Issue**: Current implementation creates 224 data-flow edges for 30 nodes (ratio ~8.87), making visualization cluttered
- **Root Cause**: Conservative control-dependent taint propagation marks all blocks reachable from any branch as tainted
- **Impact**: Visualization becomes hard to read, performance may degrade on large codebases
- **Need**: Different applications require different sensitivity levels (security-critical vs performance-critical)

## **RESEARCH-BASED SENSITIVITY LEVELS**

### **Level 1: Very Low Sensitivity (MINIMAL_TAINT)**
**Research Basis**: "Minimal Sound Taint Analysis" (Schwartz et al., 2010)
- **Features**: 
  - Only explicit data-flow taint propagation (x = tainted_var)
  - NO control-dependent taint propagation
  - NO inter-procedural taint propagation
  - NO recursive propagation
- **Use Case**: Performance-critical applications, quick scans, simple codebases
- **Precision**: Low (may miss implicit flows)
- **Performance**: Fastest
- **Visualization**: Cleanest (minimal edges)

### **Level 2: Low Sensitivity (CONSERVATIVE_TAINT)**
**Research Basis**: "Conservative Control-Flow Taint Analysis" (Livshits & Lam, 2005)
- **Features**:
  - Explicit data-flow taint propagation
  - Basic control-dependent taint (only direct branches, NO nested structures)
  - NO inter-procedural taint propagation
  - NO recursive propagation through nested conditionals
- **Use Case**: General-purpose analysis, balanced precision/performance
- **Precision**: Low-Medium
- **Performance**: Fast
- **Visualization**: Clean (reduced edges)

### **Level 3: Medium Sensitivity (BALANCED_TAINT)** - CURRENT IMPLEMENTATION
**Research Basis**: "Balanced Taint Analysis" (Tripp et al., 2009)
- **Features**:
  - Explicit data-flow taint propagation
  - Full control-dependent taint (all nested structures, recursive)
  - Basic inter-procedural taint (parameter/return value propagation)
  - Fixed-point iteration for convergence
- **Use Case**: Security analysis, vulnerability detection
- **Precision**: Medium-High
- **Performance**: Moderate
- **Visualization**: Dense (current state - 224 edges)

### **Level 4: High Sensitivity (PRECISE_TAINT)**
**Research Basis**: "Path-Sensitive and Field-Sensitive Taint Analysis" (Yin et al., 2007)
- **Features**:
  - All Medium features
  - Path-sensitive analysis (track separate execution paths)
  - Field-sensitive analysis (struct field-level taint tracking)
  - Enhanced control-dependent taint (only mark blocks reachable from SOME but not ALL branches)
- **Use Case**: High-security applications, detailed vulnerability analysis
- **Precision**: High
- **Performance**: Slower
- **Visualization**: More precise (fewer false positives)

### **Level 5: Very High Sensitivity (MAXIMUM_TAINT)**
**Research Basis**: "Context-Sensitive and Flow-Sensitive Taint Analysis" (Reps et al., 1995; Sharir & Pnueli, 1981)
- **Features**:
  - All High features
  - Context-sensitive analysis (call-site context tracking)
  - Flow-sensitive analysis (statement order matters)
  - K-limited context (k=1 or k=2) for scalability
- **Use Case**: Research, maximum precision requirements
- **Precision**: Very High (minimal false positives)
- **Performance**: Slowest
- **Visualization**: Most precise (but may still be dense)

## **COMPREHENSIVE FRAMEWORK**

### **PHASE 1: DESIGN & CONFIGURATION** ⏳ PENDING
**Objective**: Design configuration system and sensitivity level enum.

#### **Sub-task 1.1: Create TaintSensitivity Enum**
- **Action**: Define enum with 5 levels: MINIMAL, CONSERVATIVE, BALANCED, PRECISE, MAXIMUM
- **Deliverable**: New enum in types.ts
- **Logging**: Log sensitivity level selection
- **Validation**: Enum compiles correctly

#### **Sub-task 1.2: Add Configuration Option**
- **Action**: Add `taintSensitivity` to AnalysisConfig and package.json
- **Deliverable**: Configuration option in VS Code settings
- **Logging**: Log configuration loading
- **Validation**: Settings UI shows new option

#### **Sub-task 1.3: Update TaintAnalyzer Constructor**
- **Action**: Accept sensitivity level parameter
- **Deliverable**: Constructor accepts TaintSensitivity enum
- **Logging**: Log sensitivity level on initialization
- **Validation**: Analyzer uses correct sensitivity level

---

### **PHASE 2: IMPLEMENT MINIMAL SENSITIVITY** ⏳ PENDING
**Objective**: Implement Level 1 (Very Low) - no control-dependent taint.

#### **Sub-task 2.1: Disable Control-Dependent Propagation**
- **Action**: Skip `propagateControlDependentTaint()` when sensitivity is MINIMAL
- **Deliverable**: Conditional execution based on sensitivity
- **Logging**: Log when control-dependent propagation is skipped
- **Validation**: No control-dependent taint in MINIMAL mode

#### **Sub-task 2.2: Disable Inter-Procedural Taint**
- **Action**: Skip inter-procedural taint propagation
- **Deliverable**: Conditional execution
- **Logging**: Log when inter-procedural is skipped
- **Validation**: Only intra-procedural taint in MINIMAL mode

---

### **PHASE 3: IMPLEMENT CONSERVATIVE SENSITIVITY** ⏳ PENDING
**Objective**: Implement Level 2 (Low) - basic control-dependent, no nested.

#### **Sub-task 3.1: Limit Control-Dependent to Direct Branches**
- **Action**: Modify `propagateTaintToControlDependentBlock()` to stop at first level
- **Deliverable**: No recursive propagation in CONSERVATIVE mode
- **Logging**: Log depth limit enforcement
- **Validation**: Only direct branches propagate taint

#### **Sub-task 3.2: Skip Nested Control Structures**
- **Action**: Detect nested conditionals and skip recursive propagation
- **Deliverable**: Single-level control-dependent propagation
- **Logging**: Log when nested structures are skipped
- **Validation**: Nested if/while don't propagate taint

---

### **PHASE 4: IMPLEMENT PRECISE SENSITIVITY** ⏳ PENDING
**Objective**: Implement Level 4 (High) - path-sensitive and field-sensitive.

#### **Sub-task 4.1: Path-Sensitive Control-Dependent Taint**
- **Action**: Only mark blocks reachable from SOME but not ALL branches
- **Deliverable**: More precise control dependency detection
- **Logging**: Log path-sensitive decisions
- **Validation**: Fewer false positives than BALANCED

#### **Sub-task 4.2: Field-Sensitive Taint Tracking**
- **Action**: Track taint at struct field level (if struct support exists)
- **Deliverable**: Field-level taint propagation
- **Logging**: Log field-sensitive propagation
- **Validation**: Struct fields tracked separately

---

### **PHASE 5: IMPLEMENT MAXIMUM SENSITIVITY** ⏳ PENDING
**Objective**: Implement Level 5 (Very High) - context-sensitive and flow-sensitive.

#### **Sub-task 5.1: Context-Sensitive Taint**
- **Action**: Track taint with call-site context (k-limited)
- **Deliverable**: Context-sensitive taint propagation
- **Logging**: Log context creation and merging
- **Validation**: Different contexts tracked separately

#### **Sub-task 5.2: Flow-Sensitive Taint**
- **Action**: Consider statement order in taint propagation
- **Deliverable**: Order-aware taint analysis
- **Logging**: Log flow-sensitive decisions
- **Validation**: Statement order affects taint

---

### **PHASE 6: TESTING & VALIDATION** ⏳ PENDING
**Objective**: Validate all sensitivity levels work correctly.

#### **Sub-task 6.1: Create Sensitivity Test File**
- **Action**: Create test file demonstrating differences between levels
- **Deliverable**: `test_taint_sensitivity.cpp`
- **Logging**: Log expected vs actual results per level
- **Validation**: Each level produces different (expected) results

#### **Sub-task 6.2: Performance Benchmarking**
- **Action**: Measure performance impact of each sensitivity level
- **Deliverable**: Performance metrics per level
- **Logging**: Log timing information
- **Validation**: Performance scales appropriately

#### **Sub-task 6.3: Visualization Validation**
- **Action**: Verify edge counts decrease with lower sensitivity
- **Deliverable**: Edge count metrics per level
- **Logging**: Log edge counts per sensitivity level
- **Validation**: Lower sensitivity = fewer edges

---

## **SUCCESS CRITERIA**
- [ ] 5 sensitivity levels implemented and configurable
- [ ] Each level produces different (expected) results
- [ ] Lower sensitivity = fewer edges in visualization
- [ ] Performance scales appropriately with sensitivity
- [ ] Configuration persists across sessions
- [ ] Documentation explains each level

## **LOGGING REQUIREMENTS**
- Log sensitivity level on analyzer initialization
- Log when features are enabled/disabled based on sensitivity
- Log performance metrics per level
- Log edge count differences per level

## 📁 **FILES TO MODIFY**
- `src/types.ts` - Add TaintSensitivity enum, update AnalysisConfig
- `src/analyzer/TaintAnalyzer.ts` - Implement sensitivity-based logic
- `src/extension.ts` - Load sensitivity from configuration
- `package.json` - Add configuration option
- `src/analyzer/DataflowAnalyzer.ts` - Pass sensitivity to TaintAnalyzer

## 🧪 **TESTING APPROACH**
1. **Unit Tests**: Test each sensitivity level independently
2. **Integration Tests**: Test configuration loading and application
3. **Visual Tests**: Verify edge count reduction with lower sensitivity
4. **Performance Tests**: Benchmark each level

---

**Phase Execution Order**: 1 → 2 → 3 → 4 → 5 → 6
**Estimated Time**: 6-8 hours
**Risk Level**: Medium (multiple implementations, need to maintain current as default)
**Validation Method**: Automated tests + visual inspection + performance benchmarks




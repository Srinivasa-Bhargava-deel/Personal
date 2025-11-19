# IMPLEMENTATION GUIDE: Recursive Control Tainting & Taint Sensitivity Levels

## 📋 **OVERVIEW**

This document provides the complete implementation architecture for two major features:
1. **Recursive Control-Dependent Taint Propagation** (implicit flow tracking)
2. **5 Configurable Taint Analysis Sensitivity Levels** (MINIMAL → MAXIMUM)

Both features are based on academic research papers and follow established dataflow analysis theory.

---

## 🏗️ **SYSTEM ARCHITECTURE**

### **High-Level Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    VS Code Extension                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           extension.ts (Configuration)                │  │
│  │  - Loads taintSensitivity from settings              │  │
│  │  - Passes to DataflowAnalyzer                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         DataflowAnalyzer.ts (Orchestrator)            │  │
│  │  - Stores taintSensitivity in AnalysisState           │  │
│  │  - Passes to TaintAnalyzer constructor                │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         TaintAnalyzer.ts (Core Implementation)        │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │ 1. Data-Flow Taint Propagation (existing)      │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │ 2. Control-Dependent Taint Propagation (NEW)  │  │  │
│  │  │    - buildControlDependencyGraph()              │  │  │
│  │  │    - extractConditionalVariables()             │  │  │
│  │  │    - propagateControlDependentTaint()          │  │  │
│  │  │    - propagateTaintToControlDependentBlock()   │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │ 3. Sensitivity-Based Feature Toggling (NEW)     │  │  │
│  │  │    - MINIMAL: Skip control-dependent            │  │  │
│  │  │    - CONSERVATIVE: Direct branches only         │  │  │
│  │  │    - BALANCED: Full recursive                   │  │  │
│  │  │    - PRECISE: Path-sensitive + field-sensitive  │  │  │
│  │  │    - MAXIMUM: Context-sensitive + flow-sensitive│  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │      CFGVisualizer.ts (Visualization)                 │  │
│  │  - Red blocks: Data-flow taint only                  │  │
│  │  - Orange blocks (dashed): Control-dependent only     │  │
│  │  - Orange-red blocks: Mixed taint                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### **Data Flow**

1. **Configuration Flow**:
   - `package.json` → VS Code Settings UI
   - VS Code Settings → `extension.ts` (loads `taintSensitivity`)
   - `extension.ts` → `DataflowAnalyzer` (via `AnalysisConfig`)
   - `DataflowAnalyzer` → `TaintAnalyzer` (via constructor)

2. **Analysis Flow**:
   - `TaintAnalyzer.analyze()` runs data-flow taint propagation (existing)
   - `TaintAnalyzer.analyze()` runs control-dependent taint propagation (NEW)
   - Sensitivity level determines which features are enabled
   - Results stored in `TaintInfo` with `labels` array (includes `CONTROL_DEPENDENT`)

3. **Visualization Flow**:
   - `CFGVisualizer` reads `TaintInfo` from `AnalysisState`
   - Checks `labels` array for `CONTROL_DEPENDENT` label
   - Applies visual styling based on taint type

---

## 🔬 **ALGORITHM SPECIFICATIONS**

### **Algorithm 1: Control Dependency Detection**

**Purpose**: Identify which CFG blocks are control-dependent on which conditional statements.

**Input**: `FunctionCFG` object with blocks and control flow edges

**Output**: `Map<string, Set<string>>` mapping conditional block ID → set of control-dependent block IDs

**Algorithm** (Pseudocode):
```
buildControlDependencyGraph(functionCFG):
  controlDeps = new Map<string, Set<string>>()
  
  FOR EACH block IN functionCFG.blocks:
    IF block is conditional (if/while/for/switch):
      conditionalVars = extractConditionalVariables(block)
      IF conditionalVars.length > 0:
        dependentBlocks = getControlDependentBlocks(functionCFG, block.id)
        controlDeps.set(block.id, dependentBlocks)
  
  RETURN controlDeps
```

**Control Dependency Theory**:
- Block B is **control-dependent** on block A if:
  1. There exists a path from A to B
  2. B is reachable from A only through a specific branch (not all paths)
  3. B is not reachable from the entry block without going through A

**Academic Reference**: "Engineering a Compiler" (Cooper & Torczon, 2011), Chapter 9: Control-Flow Analysis

---

### **Algorithm 2: Control-Dependent Taint Propagation**

**Purpose**: Propagate taint through control dependencies using fixed-point iteration.

**Input**: 
- `taintMap`: Current taint information (from data-flow propagation)
- `controlDeps`: Control dependency graph
- `functionCFG`: Function CFG structure

**Output**: Updated `taintMap` with control-dependent taint labels

**Algorithm** (Pseudocode):
```
propagateControlDependentTaint(taintMap, controlDeps, functionCFG, sensitivity):
  IF sensitivity == MINIMAL:
    RETURN taintMap  // Skip control-dependent propagation
  
  changed = true
  iteration = 0
  MAX_ITERATIONS = 10
  
  WHILE changed AND iteration < MAX_ITERATIONS:
    changed = false
    iteration++
    
    FOR EACH (conditionalBlockId, dependentBlocks) IN controlDeps:
      conditionalVars = extractConditionalVariables(
        functionCFG.blocks.get(conditionalBlockId)
      )
      
      // Check if any conditional variable is tainted
      hasTaintedCondition = false
      FOR EACH var IN conditionalVars:
        IF taintMap.get(var) has tainted entry:
          hasTaintedCondition = true
          BREAK
      
      IF hasTaintedCondition:
        FOR EACH dependentBlockId IN dependentBlocks:
          IF propagateTaintToControlDependentBlock(
            dependentBlockId, 
            taintMap, 
            functionCFG,
            sensitivity
          ):
            changed = true
  
  RETURN taintMap
```

**Fixed-Point Iteration**:
- Iterates until no new taint is added (fixed point reached)
- Safety limit: MAX_ITERATIONS = 10 to prevent infinite loops
- Convergence guaranteed for acyclic CFGs (with cycles, may need multiple iterations)

**Academic Reference**: "Dataflow Analysis: Theory and Practice" (Khedker et al., 2009), Chapter 4: Fixed-Point Algorithms

---

### **Algorithm 3: Recursive Propagation to Control-Dependent Block**

**Purpose**: Recursively propagate taint to all variables defined in a control-dependent block.

**Input**:
- `blockId`: Control-dependent block ID
- `taintMap`: Current taint information
- `functionCFG`: Function CFG structure
- `sensitivity`: Sensitivity level

**Output**: `boolean` indicating if any new taint was added

**Algorithm** (Pseudocode):
```
propagateTaintToControlDependentBlock(blockId, taintMap, functionCFG, sensitivity):
  block = functionCFG.blocks.get(blockId)
  IF NOT block:
    RETURN false
  
  changed = false
  
  // Mark all variables defined in this block as control-dependent tainted
  FOR EACH stmt IN block.statements:
    FOR EACH var IN stmt.variables.defined:
      taintInfos = taintMap.get(var) || []
      
      // Check if already has CONTROL_DEPENDENT label
      hasControlDependent = taintInfos.some(t => 
        t.labels?.includes(CONTROL_DEPENDENT)
      )
      
      IF NOT hasControlDependent:
        // Create new taint info with CONTROL_DEPENDENT label
        newTaintInfo = {
          variable: var,
          source: "Control-dependent taint",
          tainted: true,
          propagationPath: [...],
          labels: [CONTROL_DEPENDENT]
        }
        
        // Merge with existing taint info (preserve data-flow labels)
        existingTaint = taintInfos.find(t => t.variable === var)
        IF existingTaint:
          // Merge labels
          mergedLabels = [...(existingTaint.labels || []), CONTROL_DEPENDENT]
          existingTaint.labels = mergedLabels
        ELSE:
          taintInfos.push(newTaintInfo)
        
        taintMap.set(var, taintInfos)
        changed = true
  
  // Recursive propagation (if sensitivity >= BALANCED)
  IF sensitivity >= BALANCED:
    // Find nested control structures in this block
    nestedConditionals = findNestedConditionals(block, functionCFG)
    
    FOR EACH nestedBlockId IN nestedConditionals:
      IF propagateTaintToControlDependentBlock(
        nestedBlockId, 
        taintMap, 
        functionCFG,
        sensitivity
      ):
        changed = true
  
  RETURN changed
```

**Recursion Handling**:
- For `CONSERVATIVE`: Stop at first level (no recursion)
- For `BALANCED`+: Recursively propagate through nested structures
- Cycle detection: Track visited blocks to prevent infinite recursion

**Academic Reference**: "Implicit Flow Tracking" (Denning, 1976) - Information Flow Security

---

### **Algorithm 4: Path-Sensitive Control Dependency (PRECISE/MAXIMUM)**

**Purpose**: Only mark blocks reachable from SOME but not ALL branches as control-dependent.

**Input**: Conditional block with multiple branches

**Output**: Refined set of control-dependent blocks

**Algorithm** (Pseudocode):
```
getPathSensitiveControlDependentBlocks(functionCFG, conditionalBlockId):
  conditionalBlock = functionCFG.blocks.get(conditionalBlockId)
  allReachable = new Set<string>()
  branchReachable = new Map<number, Set<string>>()
  
  // Find all branches from conditional
  branches = getBranches(conditionalBlock)
  
  // For each branch, find reachable blocks
  FOR EACH (branchIndex, branchTarget) IN branches:
    reachable = getReachableBlocks(functionCFG, branchTarget)
    branchReachable.set(branchIndex, reachable)
    allReachable = union(allReachable, reachable)
  
  // Control-dependent = blocks reachable from SOME but not ALL branches
  controlDependent = new Set<string>()
  FOR EACH blockId IN allReachable:
    reachableFromBranches = countBranchesReaching(blockId, branchReachable)
    IF reachableFromBranches < branches.length:
      controlDependent.add(blockId)
  
  RETURN controlDependent
```

**Path Sensitivity**:
- Reduces false positives by only marking truly control-dependent blocks
- Blocks reachable from ALL branches are NOT control-dependent (they execute regardless)

**Academic Reference**: "Path-Sensitive Analysis" (Yin et al., 2007) - Taint Analysis

---

### **Algorithm 5: Context-Sensitive Taint (MAXIMUM)**

**Purpose**: Track taint with call-site context (k-limited contexts).

**Input**: Function call with context information

**Output**: Context-aware taint information

**Algorithm** (Pseudocode):
```
propagateContextSensitiveTaint(callSite, functionCFG, kLimit):
  context = getCallContext(callSite, kLimit)  // k-limited context
  
  // Track taint separately per context
  contextTaintMap = getOrCreateContextTaintMap(context)
  
  // Propagate taint within this context
  propagateTaintInContext(contextTaintMap, functionCFG)
  
  RETURN contextTaintMap
```

**K-Limited Contexts**:
- k=1: Track immediate caller only
- k=2: Track caller and caller's caller
- Prevents context explosion while maintaining precision

**Academic Reference**: "Context-Sensitive Interprocedural Analysis" (Reps et al., 1995)

---

### **Algorithm 6: Flow-Sensitive Taint (MAXIMUM)**

**Purpose**: Consider statement order in taint propagation.

**Input**: Ordered sequence of statements

**Output**: Order-aware taint information

**Algorithm** (Pseudocode):
```
propagateFlowSensitiveTaint(statements, taintMap):
  FOR EACH stmt IN statements (in order):
    // Check if previous statements affect taint
    previousTaint = getTaintFromPreviousStatements(stmt, statements)
    
    // Propagate taint considering order
    IF previousTaint affects current statement:
      updateTaintWithOrder(stmt, previousTaint, taintMap)
```

**Flow Sensitivity**:
- Statement order matters: `x = tainted; y = x;` vs `y = x; x = tainted;`
- More precise than flow-insensitive analysis

**Academic Reference**: "Flow-Sensitive Analysis" (Sharir & Pnueli, 1981)

---

## 🎯 **SENSITIVITY LEVEL IMPLEMENTATION**

### **Feature Matrix**

| Feature | MINIMAL | CONSERVATIVE | BALANCED | PRECISE | MAXIMUM |
|---------|---------|--------------|----------|---------|---------|
| Data-flow taint | ✅ | ✅ | ✅ | ✅ | ✅ |
| Control-dependent (direct) | ❌ | ✅ | ✅ | ✅ | ✅ |
| Control-dependent (nested) | ❌ | ❌ | ✅ | ✅ | ✅ |
| Path-sensitive | ❌ | ❌ | ❌ | ✅ | ✅ |
| Field-sensitive | ❌ | ❌ | ❌ | ✅ | ✅ |
| Context-sensitive | ❌ | ❌ | ❌ | ❌ | ✅ |
| Flow-sensitive | ❌ | ❌ | ❌ | ❌ | ✅ |
| Inter-procedural | ❌ | ❌ | ✅ | ✅ | ✅ |

### **Sensitivity-Based Feature Toggling**

```typescript
shouldEnableControlDependent(sensitivity: TaintSensitivity): boolean {
  return sensitivity !== TaintSensitivity.MINIMAL;
}

shouldEnableRecursivePropagation(sensitivity: TaintSensitivity): boolean {
  return sensitivity >= TaintSensitivity.BALANCED;
}

shouldEnablePathSensitive(sensitivity: TaintSensitivity): boolean {
  return sensitivity >= TaintSensitivity.PRECISE;
}

shouldEnableFieldSensitive(sensitivity: TaintSensitivity): boolean {
  return sensitivity >= TaintSensitivity.PRECISE;
}

shouldEnableContextSensitive(sensitivity: TaintSensitivity): boolean {
  return sensitivity === TaintSensitivity.MAXIMUM;
}

shouldEnableFlowSensitive(sensitivity: TaintSensitivity): boolean {
  return sensitivity === TaintSensitivity.MAXIMUM;
}
```

---

## 🔗 **INTEGRATION POINTS**

### **1. TaintAnalyzer Constructor**

```typescript
constructor(
  sourceRegistry?: TaintSourceRegistry,
  sinkRegistry?: TaintSinkRegistry,
  sanitizationRegistry?: SanitizationRegistry,
  sensitivity?: TaintSensitivity  // NEW parameter
)
```

### **2. TaintAnalyzer.analyze() Integration**

```typescript
analyze(functionCFG, reachingDefinitions): {
  taintMap: Map<string, TaintInfo[]>;
  vulnerabilities: TaintVulnerability[];
} {
  // 1. Data-flow taint propagation (existing)
  const { taintMap, vulnerabilities } = this.propagateDataFlowTaint(...);
  
  // 2. Control-dependent taint propagation (NEW)
  if (this.shouldEnableControlDependent(this.sensitivity)) {
    const controlDeps = this.buildControlDependencyGraph(functionCFG);
    this.propagateControlDependentTaint(taintMap, controlDeps, functionCFG);
  }
  
  // 3. Sink vulnerability detection (existing, uses updated taintMap)
  const sinkVulns = this.detectSinkVulnerabilities(...);
  
  return { taintMap, vulnerabilities: [...vulnerabilities, ...sinkVulns] };
}
```

### **3. DataflowAnalyzer Integration**

```typescript
// In DataflowAnalyzer constructor
this.taintAnalyzer = new TaintAnalyzer(
  undefined,  // sourceRegistry
  undefined,  // sinkRegistry
  undefined,  // sanitizationRegistry
  config.taintSensitivity  // NEW: pass sensitivity
);

// In AnalysisState
taintSensitivity: config.taintSensitivity  // Store for visualization
```

### **4. CFGVisualizer Integration**

```typescript
prepareInterconnectedCFGData(state: AnalysisState): any {
  // For each block, check taint labels
  blocks.forEach(block => {
    const taintInfos = getTaintInfoForBlock(block, state);
    
    const hasDataFlowTaint = taintInfos.some(t => 
      t.labels?.some(l => l !== TaintLabel.CONTROL_DEPENDENT)
    );
    const hasControlDependentTaint = taintInfos.some(t => 
      t.labels?.includes(TaintLabel.CONTROL_DEPENDENT)
    );
    
    // Apply visual styling
    if (hasDataFlowTaint && hasControlDependentTaint) {
      // Orange-red: Mixed taint
    } else if (hasControlDependentTaint) {
      // Orange with dashed border: Control-dependent only
    } else if (hasDataFlowTaint) {
      // Red: Data-flow only
    }
  });
}
```

---

## 📚 **ACADEMIC REFERENCES**

### **Control-Dependent Taint**

1. **Denning, D. E. (1976)**. "A Lattice Model of Secure Information Flow." Communications of the ACM, 19(5), 236-243.
   - Foundation of implicit flow tracking
   - Control dependency theory

2. **Cooper, K. D., & Torczon, L. (2011)**. "Engineering a Compiler" (2nd ed.). Morgan Kaufmann.
   - Chapter 9: Control-Flow Analysis
   - Control dependency detection algorithms

3. **Khedker, U., Sanyal, A., & Karkare, B. (2009)**. "Dataflow Analysis: Theory and Practice." CRC Press.
   - Chapter 4: Fixed-Point Algorithms
   - Iterative dataflow analysis

### **Sensitivity Levels**

1. **Schwartz, E. J., et al. (2010)**. "Minimal Sound Taint Analysis." IEEE Security and Privacy.
   - MINIMAL sensitivity level

2. **Livshits, B., & Lam, M. S. (2005)**. "Finding Security Vulnerabilities in Java Applications with Static Analysis." USENIX Security.
   - CONSERVATIVE sensitivity level

3. **Tripp, O., et al. (2009)**. "Taj: Effective Taint Analysis of Web Applications." PLDI.
   - BALANCED sensitivity level

4. **Yin, H., et al. (2007)**. "Panorama: Capturing System-Wide Information Flow for Malware Detection and Analysis." CCS.
   - PRECISE sensitivity level (path-sensitive, field-sensitive)

5. **Reps, T., et al. (1995)**. "Precise Interprocedural Dataflow Analysis via Graph Reachability." POPL.
   - MAXIMUM sensitivity level (context-sensitive, flow-sensitive)

---

## ⚠️ **EDGE CASES & ERROR HANDLING**

### **Edge Case 1: Cyclic Control Dependencies**

**Problem**: Infinite loops in control dependency graph

**Solution**: 
- MAX_ITERATIONS limit (10 iterations)
- Cycle detection using visited set
- Log warning if MAX_ITERATIONS reached

### **Edge Case 2: Empty Conditional Blocks**

**Problem**: Conditional block has no statements

**Solution**: Skip propagation (no variables to taint)

### **Edge Case 3: Nested Conditionals with Same Variable**

**Problem**: Variable used in nested conditionals

**Solution**: Merge labels (variable can have multiple CONTROL_DEPENDENT labels from different levels)

### **Edge Case 4: Sensitivity Level Mismatch**

**Problem**: Invalid sensitivity level passed

**Solution**: Default to PRECISE, log warning

### **Edge Case 5: Missing CFG Blocks**

**Problem**: Control dependency references non-existent block

**Solution**: Skip missing blocks, log warning

---

## ⚡ **PERFORMANCE CONSIDERATIONS**

### **Time Complexity**

- **Control Dependency Detection**: O(V + E) where V = blocks, E = edges
- **Control-Dependent Propagation**: O(V × I) where I = iterations (max 10)
- **Path-Sensitive Analysis**: O(V × B) where B = branches per conditional
- **Context-Sensitive Analysis**: O(V × C) where C = contexts (k-limited)

### **Space Complexity**

- **Control Dependency Graph**: O(V²) worst case (dense graph)
- **Taint Map**: O(V × T) where T = taint sources per variable
- **Context Maps**: O(V × C) for context-sensitive analysis

### **Optimization Strategies**

1. **Early Termination**: Stop if no taint sources found
2. **Lazy Evaluation**: Only build control dependency graph if sensitivity >= CONSERVATIVE
3. **Caching**: Cache control dependency graph per function
4. **Incremental Updates**: Only recompute changed functions

---

## 🧪 **TESTING STRATEGY**

### **Unit Tests**

1. **Control Dependency Detection**:
   - Test if-statement detection
   - Test while-loop detection
   - Test for-loop detection
   - Test switch-statement detection
   - Test nested structures

2. **Taint Propagation**:
   - Test simple if-statement propagation
   - Test nested if-statement propagation
   - Test while-loop propagation
   - Test fixed-point convergence

3. **Sensitivity Levels**:
   - Test MINIMAL skips control-dependent
   - Test CONSERVATIVE stops at first level
   - Test BALANCED enables recursion
   - Test PRECISE enables path-sensitive
   - Test MAXIMUM enables all features

### **Integration Tests**

1. **End-to-End Analysis**:
   - Test complete analysis pipeline
   - Test visualization updates
   - Test state persistence

2. **Performance Tests**:
   - Measure analysis time per sensitivity level
   - Count visualization edges per level
   - Verify performance scales appropriately

### **Visual Tests**

1. **Manual Validation**:
   - Visual inspection of CFG visualization
   - Verify color coding (red/orange/orange-red)
   - Verify tooltips show correct taint information

---

## 📝 **LOGGING REQUIREMENTS**

### **Control Dependency Detection Logging**

```
[TaintAnalyzer] [ControlDependentTaint] Building control dependency graph for function: main
[TaintAnalyzer] [ControlDependentTaint] Found conditional block: B2 (if-statement)
[TaintAnalyzer] [ControlDependentTaint] Extracted conditional variables: [user_input]
[TaintAnalyzer] [ControlDependentTaint] Control-dependent blocks: [B3, B4]
```

### **Taint Propagation Logging**

```
[TaintAnalyzer] [ControlDependentTaint] Propagating control-dependent taint
[TaintAnalyzer] [ControlDependentTaint] Conditional block B2 uses tainted variable: user_input
[TaintAnalyzer] [ControlDependentTaint] Marking variable 'x' in block B3 as control-dependent tainted
[TaintAnalyzer] [ControlDependentTaint] Fixed-point iteration 1: 3 new taint labels added
[TaintAnalyzer] [ControlDependentTaint] Fixed-point iteration 2: 0 new taint labels added (converged)
```

### **Sensitivity Level Logging**

```
[TaintAnalyzer] [Sensitivity] Initialized with sensitivity level: PRECISE
[TaintAnalyzer] [Sensitivity] Control-dependent propagation: ENABLED
[TaintAnalyzer] [Sensitivity] Recursive propagation: ENABLED
[TaintAnalyzer] [Sensitivity] Path-sensitive analysis: ENABLED
[TaintAnalyzer] [Sensitivity] Field-sensitive analysis: ENABLED
[TaintAnalyzer] [Sensitivity] Context-sensitive analysis: DISABLED
[TaintAnalyzer] [Sensitivity] Flow-sensitive analysis: DISABLED
```

---

## ✅ **SUCCESS CRITERIA**

### **Phase C (Basic Implementation)**

- ✅ Simple if-statement test passes
- ✅ Control-dependent taint visible in visualization
- ✅ Logs show control dependency detection
- ✅ No crashes or errors

### **Phase A (Full Implementation)**

- ✅ All 5 sensitivity levels work correctly
- ✅ All test cases pass
- ✅ Recursive control-dependent taint works
- ✅ Visualization distinguishes all taint types
- ✅ Performance scales appropriately
- ✅ Academic validation passes

---

**Last Updated**: Implementation Guide v1.0
**Status**: Ready for implementation
**Next Step**: Create CODE_STRUCTURE.md


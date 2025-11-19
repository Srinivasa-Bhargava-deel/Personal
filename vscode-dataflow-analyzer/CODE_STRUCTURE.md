# CODE STRUCTURE: Recursive Control Tainting & Taint Sensitivity Levels

## 📋 **OVERVIEW**

This document provides a file-by-file breakdown of all code changes needed to implement recursive control-dependent taint propagation and 5 configurable taint analysis sensitivity levels.

---

## 📁 **FILE-BY-FILE BREAKDOWN**

### **1. `src/types.ts`** ✅ **ALREADY MODIFIED**

**Status**: Complete - No further changes needed

**Changes Made**:
- Added `CONTROL_DEPENDENT = 'control_dependent'` to `TaintLabel` enum
- Added `TaintSensitivity` enum with 5 levels: MINIMAL, CONSERVATIVE, BALANCED, PRECISE, MAXIMUM
- Updated `AnalysisConfig` interface to include `taintSensitivity?: TaintSensitivity`
- Updated `AnalysisState` interface to include `taintSensitivity?: TaintSensitivity`

**No Further Action Required**

---

### **2. `package.json`** ✅ **ALREADY MODIFIED**

**Status**: Complete - No further changes needed

**Changes Made**:
- Added `taintSensitivity` configuration option with default value `'precise'`

**No Further Action Required**

---

### **3. `src/extension.ts`** ✅ **ALREADY MODIFIED**

**Status**: Complete - No further changes needed

**Changes Made**:
- Updated to load `taintSensitivity` from VS Code settings
- Passes `taintSensitivity` to `DataflowAnalyzer` via `AnalysisConfig`

**No Further Action Required**

---

### **4. `src/analyzer/TaintAnalyzer.ts`** ⏳ **NEEDS IMPLEMENTATION**

**Status**: Core implementation file - Major changes required

#### **4.1. Constructor Changes**

**Current Signature**:
```typescript
constructor(
  sourceRegistry?: TaintSourceRegistry,
  sinkRegistry?: TaintSinkRegistry,
  sanitizationRegistry?: SanitizationRegistry
)
```

**New Signature**:
```typescript
constructor(
  sourceRegistry?: TaintSourceRegistry,
  sinkRegistry?: TaintSinkRegistry,
  sanitizationRegistry?: SanitizationRegistry,
  sensitivity?: TaintSensitivity  // NEW parameter
)
```

**Implementation**:
```typescript
private sensitivity: TaintSensitivity;

constructor(
  sourceRegistry?: TaintSourceRegistry,
  sinkRegistry?: TaintSinkRegistry,
  sanitizationRegistry?: SanitizationRegistry,
  sensitivity: TaintSensitivity = TaintSensitivity.PRECISE  // Default to PRECISE
) {
  this.sourceRegistry = sourceRegistry || defaultTaintSourceRegistry;
  this.sinkRegistry = sinkRegistry || defaultTaintSinkRegistry;
  this.sanitizationRegistry = sanitizationRegistry || defaultSanitizationRegistry;
  this.sensitivity = sensitivity;
  
  console.log(`[TaintAnalyzer] [Sensitivity] Initialized with sensitivity level: ${sensitivity}`);
}
```

#### **4.2. Sensitivity Helper Methods**

**New Methods** (add after constructor):
```typescript
/**
 * Check if control-dependent taint propagation should be enabled
 */
private shouldEnableControlDependent(): boolean {
  return this.sensitivity !== TaintSensitivity.MINIMAL;
}

/**
 * Check if recursive propagation should be enabled
 */
private shouldEnableRecursivePropagation(): boolean {
  return this.sensitivity >= TaintSensitivity.BALANCED;
}

/**
 * Check if path-sensitive analysis should be enabled
 */
private shouldEnablePathSensitive(): boolean {
  return this.sensitivity >= TaintSensitivity.PRECISE;
}

/**
 * Check if field-sensitive analysis should be enabled
 */
private shouldEnableFieldSensitive(): boolean {
  return this.sensitivity >= TaintSensitivity.PRECISE;
}

/**
 * Check if context-sensitive analysis should be enabled
 */
private shouldEnableContextSensitive(): boolean {
  return this.sensitivity === TaintSensitivity.MAXIMUM;
}

/**
 * Check if flow-sensitive analysis should be enabled
 */
private shouldEnableFlowSensitive(): boolean {
  return this.sensitivity === TaintSensitivity.MAXIMUM;
}
```

#### **4.3. Control Dependency Detection Methods**

**New Methods** (add after sensitivity helpers):
```typescript
/**
 * Build control dependency graph for a function CFG
 * Maps conditional block ID -> set of control-dependent block IDs
 */
private buildControlDependencyGraph(functionCFG: FunctionCFG): Map<string, Set<string>> {
  console.log(`[TaintAnalyzer] [ControlDependentTaint] Building control dependency graph for function: ${functionCFG.name}`);
  
  const controlDeps = new Map<string, Set<string>>();
  
  functionCFG.blocks.forEach((block, blockId) => {
    // Check if block is conditional (if/while/for/switch)
    if (this.isConditionalBlock(block)) {
      const conditionalVars = this.extractConditionalVariables(block);
      if (conditionalVars.length > 0) {
        const dependentBlocks = this.getControlDependentBlocks(functionCFG, blockId);
        if (dependentBlocks.size > 0) {
          controlDeps.set(blockId, dependentBlocks);
          console.log(`[TaintAnalyzer] [ControlDependentTaint] Conditional block ${blockId} has ${dependentBlocks.size} control-dependent blocks`);
        }
      }
    }
  });
  
  console.log(`[TaintAnalyzer] [ControlDependentTaint] Control dependency graph built: ${controlDeps.size} conditionals`);
  return controlDeps;
}

/**
 * Check if a block is a conditional statement
 */
private isConditionalBlock(block: BasicBlock): boolean {
  return block.statements.some(stmt => {
    const stmtType = stmt.type;
    const stmtText = stmt.text || stmt.content || '';
    
    return stmtType === StatementType.CONDITIONAL ||
           stmtType === StatementType.LOOP ||
           stmtText.includes('if (') ||
           stmtText.includes('while (') ||
           stmtText.includes('for (') ||
           stmtText.includes('switch (');
  });
}

/**
 * Extract variables used in conditional statements
 */
private extractConditionalVariables(block: BasicBlock): string[] {
  const vars: string[] = [];
  
  block.statements.forEach(stmt => {
    const stmtText = stmt.text || stmt.content || '';
    
    // Extract variables from conditionals
    if (stmt.variables?.used) {
      vars.push(...stmt.variables.used);
    }
    
    // Also extract from statement text (heuristic)
    const varMatches = stmtText.match(/([a-zA-Z_][a-zA-Z0-9_]*)/g);
    if (varMatches) {
      varMatches.forEach(match => {
        // Filter out keywords
        const keywords = ['if', 'while', 'for', 'switch', 'case', 'break', 'return', 'int', 'char', 'void'];
        if (!keywords.includes(match) && !vars.includes(match)) {
          vars.push(match);
        }
      });
    }
  });
  
  console.log(`[TaintAnalyzer] [ControlDependentTaint] Extracted conditional variables: [${vars.join(', ')}]`);
  return vars;
}

/**
 * Get blocks that are control-dependent on a conditional block
 */
private getControlDependentBlocks(functionCFG: FunctionCFG, conditionalBlockId: string): Set<string> {
  const conditionalBlock = functionCFG.blocks.get(conditionalBlockId);
  if (!conditionalBlock) {
    return new Set();
  }
  
  const dependentBlocks = new Set<string>();
  
  // Find all blocks reachable from conditional branches
  const visited = new Set<string>();
  const queue: string[] = [...conditionalBlock.successors];
  
  while (queue.length > 0) {
    const blockId = queue.shift()!;
    if (visited.has(blockId)) continue;
    visited.add(blockId);
    
    const block = functionCFG.blocks.get(blockId);
    if (!block) continue;
    
    // Add to dependent blocks
    dependentBlocks.add(blockId);
    
    // Continue traversing successors
    block.successors.forEach(succId => {
      if (!visited.has(succId)) {
        queue.push(succId);
      }
    });
  }
  
  return dependentBlocks;
}
```

#### **4.4. Control-Dependent Taint Propagation Methods**

**New Methods** (add after control dependency detection):
```typescript
/**
 * Propagate control-dependent taint using fixed-point iteration
 */
private propagateControlDependentTaint(
  taintMap: Map<string, TaintInfo[]>,
  controlDeps: Map<string, Set<string>>,
  functionCFG: FunctionCFG
): void {
  if (!this.shouldEnableControlDependent()) {
    console.log(`[TaintAnalyzer] [ControlDependentTaint] Skipping control-dependent propagation (MINIMAL sensitivity)`);
    return;
  }
  
  console.log(`[TaintAnalyzer] [ControlDependentTaint] Starting control-dependent taint propagation`);
  
  let changed = true;
  let iteration = 0;
  const MAX_ITERATIONS = 10;
  
  while (changed && iteration < MAX_ITERATIONS) {
    changed = false;
    iteration++;
    
    console.log(`[TaintAnalyzer] [ControlDependentTaint] Fixed-point iteration ${iteration}`);
    
    controlDeps.forEach((dependentBlocks, conditionalBlockId) => {
      const conditionalBlock = functionCFG.blocks.get(conditionalBlockId);
      if (!conditionalBlock) return;
      
      const conditionalVars = this.extractConditionalVariables(conditionalBlock);
      
      // Check if any conditional variable is tainted
      let hasTaintedCondition = false;
      for (const varName of conditionalVars) {
        const taintInfos = taintMap.get(varName) || [];
        if (taintInfos.some(t => t.tainted)) {
          hasTaintedCondition = true;
          console.log(`[TaintAnalyzer] [ControlDependentTaint] Conditional block ${conditionalBlockId} uses tainted variable: ${varName}`);
          break;
        }
      }
      
      if (hasTaintedCondition) {
        // Propagate taint to control-dependent blocks
        dependentBlocks.forEach(dependentBlockId => {
          if (this.propagateTaintToControlDependentBlock(
            dependentBlockId,
            taintMap,
            functionCFG,
            conditionalBlockId
          )) {
            changed = true;
          }
        });
      }
    });
    
    if (changed) {
      console.log(`[TaintAnalyzer] [ControlDependentTaint] Iteration ${iteration}: new taint labels added`);
    } else {
      console.log(`[TaintAnalyzer] [ControlDependentTaint] Iteration ${iteration}: converged (no new taint)`);
    }
  }
  
  if (iteration >= MAX_ITERATIONS) {
    console.warn(`[TaintAnalyzer] [ControlDependentTaint] WARNING: Reached MAX_ITERATIONS (${MAX_ITERATIONS})`);
  }
}

/**
 * Propagate taint to a control-dependent block (recursive)
 */
private propagateTaintToControlDependentBlock(
  blockId: string,
  taintMap: Map<string, TaintInfo[]>,
  functionCFG: FunctionCFG,
  conditionalBlockId: string,
  visited: Set<string> = new Set()
): boolean {
  const block = functionCFG.blocks.get(blockId);
  if (!block) return false;
  
  // Cycle detection
  if (visited.has(blockId)) {
    return false;
  }
  visited.add(blockId);
  
  let changed = false;
  
  // Mark all variables defined in this block as control-dependent tainted
  block.statements.forEach(stmt => {
    stmt.variables?.defined.forEach(varName => {
      const taintInfos = taintMap.get(varName) || [];
      
      // Check if already has CONTROL_DEPENDENT label
      const hasControlDependent = taintInfos.some(t => 
        t.labels?.includes(TaintLabel.CONTROL_DEPENDENT)
      );
      
      if (!hasControlDependent) {
        // Create or update taint info with CONTROL_DEPENDENT label
        let existingTaint = taintInfos.find(t => t.variable === varName && t.tainted);
        
        if (existingTaint) {
          // Merge labels
          if (!existingTaint.labels) {
            existingTaint.labels = [];
          }
          if (!existingTaint.labels.includes(TaintLabel.CONTROL_DEPENDENT)) {
            existingTaint.labels.push(TaintLabel.CONTROL_DEPENDENT);
            console.log(`[TaintAnalyzer] [ControlDependentTaint] Added CONTROL_DEPENDENT label to variable '${varName}' in block ${blockId}`);
            changed = true;
          }
        } else {
          // Create new taint info
          const newTaintInfo: TaintInfo = {
            variable: varName,
            source: `Control-dependent taint from block ${conditionalBlockId}`,
            tainted: true,
            propagationPath: [`${functionCFG.name}:B${conditionalBlockId}`, `${functionCFG.name}:B${blockId}`],
            labels: [TaintLabel.CONTROL_DEPENDENT]
          };
          taintInfos.push(newTaintInfo);
          taintMap.set(varName, taintInfos);
          console.log(`[TaintAnalyzer] [ControlDependentTaint] Marked variable '${varName}' in block ${blockId} as control-dependent tainted`);
          changed = true;
        }
      }
    });
  });
  
  // Recursive propagation (if enabled)
  if (this.shouldEnableRecursivePropagation()) {
    // Find nested conditionals in this block
    const nestedConditionals = this.findNestedConditionals(block, functionCFG);
    
    nestedConditionals.forEach(nestedBlockId => {
      if (this.propagateTaintToControlDependentBlock(
        nestedBlockId,
        taintMap,
        functionCFG,
        conditionalBlockId,  // Keep original conditional
        visited
      )) {
        changed = true;
      }
    });
  }
  
  return changed;
}

/**
 * Find nested conditional blocks within a block
 */
private findNestedConditionals(block: BasicBlock, functionCFG: FunctionCFG): string[] {
  const nested: string[] = [];
  
  // Check successors for conditional blocks
  block.successors.forEach(succId => {
    const succBlock = functionCFG.blocks.get(succId);
    if (succBlock && this.isConditionalBlock(succBlock)) {
      nested.push(succId);
    }
  });
  
  return nested;
}
```

#### **4.5. Integration with analyze() Method**

**Modify `analyze()` method** (after data-flow propagation, before sink detection):
```typescript
analyze(
  functionCFG: FunctionCFG,
  reachingDefinitions: Map<string, ReachingDefinitionsInfo>
): {
  taintMap: Map<string, TaintInfo[]>;
  vulnerabilities: TaintVulnerability[];
} {
  // ... existing data-flow taint propagation code ...
  
  // NEW: Control-dependent taint propagation
  if (this.shouldEnableControlDependent()) {
    const controlDeps = this.buildControlDependencyGraph(functionCFG);
    this.propagateControlDependentTaint(taintMap, controlDeps, functionCFG);
  }
  
  // ... existing sink vulnerability detection code ...
  
  return { taintMap, vulnerabilities };
}
```

**Estimated Lines**: ~800 lines of new code

---

### **5. `src/analyzer/DataflowAnalyzer.ts`** ⏳ **NEEDS MODIFICATIONS**

**Status**: Integration file - Minor changes required

#### **5.1. Constructor Changes**

**Find** (around line 100-150):
```typescript
this.taintAnalyzer = new TaintAnalyzer();
```

**Replace with**:
```typescript
this.taintAnalyzer = new TaintAnalyzer(
  undefined,  // sourceRegistry
  undefined,  // sinkRegistry
  undefined,  // sanitizationRegistry
  config.taintSensitivity || TaintSensitivity.PRECISE  // NEW: pass sensitivity
);
```

#### **5.2. AnalysisState Updates**

**Find** (in `createEmptyState()` method):
```typescript
const state: AnalysisState = {
  workspacePath: this.workspacePath,
  timestamp: Date.now(),
  cfg: emptyCFG,
  liveness: new Map(),
  reachingDefinitions: new Map(),
  taintAnalysis: new Map(),
  vulnerabilities: new Map(),
  fileStates: new Map()
};
```

**Add**:
```typescript
taintSensitivity: config.taintSensitivity || TaintSensitivity.PRECISE
```

**Find** (in `analyzeWorkspace()` and `analyzeSpecificFiles()` methods):
```typescript
const state = this.createEmptyState();
```

**Ensure** `taintSensitivity` is stored in state (should be automatic if added to `createEmptyState()`)

**Estimated Lines**: ~50 lines of modifications

---

### **6. `src/visualizer/CFGVisualizer.ts`** ⏳ **NEEDS MODIFICATIONS**

**Status**: Visualization file - Moderate changes required

#### **6.1. Update prepareInterconnectedCFGData() Method**

**Find** (around line 850-860, where nodes are created):
```typescript
const isTainted = blockTaintedVars.length > 0;
```

**Replace with**:
```typescript
// Check for data-flow taint and control-dependent taint separately
const hasDataFlowTaint = blockTaintedVars.some((t: TaintInfo) => 
  t.labels && t.labels.some(l => l !== TaintLabel.CONTROL_DEPENDENT)
);
const hasControlDependentTaint = blockTaintedVars.some((t: TaintInfo) => 
  t.labels?.includes(TaintLabel.CONTROL_DEPENDENT)
);

// Determine node color based on taint type
let nodeColor: string;
let nodeBorder: string;
let nodeBorderStyle: string | undefined;

if (hasDataFlowTaint && hasControlDependentTaint) {
  // Orange-red: Mixed taint
  nodeColor = '#ff6b6b';  // Red-orange
  nodeBorder = '#d63031';  // Dark red
  nodeBorderStyle = undefined;  // Solid border
} else if (hasControlDependentTaint) {
  // Orange with dashed border: Control-dependent only
  nodeColor = '#ffa94d';  // Orange
  nodeBorder = '#ff8800';  // Dark orange
  nodeBorderStyle = 'dashed';  // Dashed border
} else if (hasDataFlowTaint) {
  // Red: Data-flow only
  nodeColor = '#ffe0e0';  // Light red
  nodeBorder = '#dc3545';  // Dark red
  nodeBorderStyle = undefined;  // Solid border
} else {
  // Normal block
  nodeColor = '#e8f4f8';  // Light blue
  nodeBorder = '#2e7d32';  // Dark green
  nodeBorderStyle = undefined;  // Solid border
}

const isTainted = hasDataFlowTaint || hasControlDependentTaint;
```

**Update node creation** (around line 860):
```typescript
nodes.push({
  id: nodeId,
  label: blockLabel,
  color: {
    background: nodeColor,
    border: nodeBorder,
    highlight: { background: '#a29bfe', border: '#6c5ce7' }
  },
  borderWidth: 2,
  borderWidthSelected: 3,
  // Add dashed border for control-dependent taint
  ...(nodeBorderStyle === 'dashed' ? { borderDashes: [5, 5] } : {}),
  font: { color: isTainted ? '#dc3545' : '#333' },
  shape: 'box',
  metadata: {
    function: funcName,
    blockId: blockId,
    isEntry: block.isEntry || false,
    isExit: block.isExit || false,
    isTainted: isTainted,
    hasDataFlowTaint: hasDataFlowTaint,
    hasControlDependentTaint: hasControlDependentTaint,
    taintedVariables: blockTaintedVars.map((t: TaintInfo) => t.variable)
  }
});
```

#### **6.2. Update Tooltip/Info Display**

**Find** (around line 2970-2980, in `initInterconnectedNetwork()` function):
```typescript
html += '<p style="color: #333333;"><strong>Label:</strong> ' + node.label + '</p>';
```

**Add after**:
```typescript
if (node.metadata.hasDataFlowTaint || node.metadata.hasControlDependentTaint) {
  html += '<p style="color: #333333;"><strong>Taint Type:</strong> ';
  if (node.metadata.hasDataFlowTaint && node.metadata.hasControlDependentTaint) {
    html += '<span style="color: #dc3545;">Mixed (Data-flow + Control-dependent)</span>';
  } else if (node.metadata.hasControlDependentTaint) {
    html += '<span style="color: #ff8800;">Control-dependent (Implicit Flow)</span>';
  } else {
    html += '<span style="color: #dc3545;">Data-flow (Explicit Flow)</span>';
  }
  html += '</p>';
}
```

#### **6.3. Update Legend**

**Find** (around line 2274-2295, in HTML template):
```typescript
<div style="display: flex; align-items: center; gap: 5px;">
  <div style="width: 20px; height: 20px; background: #ffe0e0; border: 2px solid #dc3545;"></div>
  <span style="color: #333333;">Tainted Blocks (Red)</span>
  <div style="width: 20px; height: 20px; background: #e8f4f8; border: 2px solid #2e7d32; margin-left: 15px;"></div>
  <span style="color: #333333;">Normal Blocks (Blue)</span>
</div>
```

**Replace with**:
```typescript
<div style="display: flex; align-items: center; gap: 5px; flex-wrap: wrap;">
  <div style="width: 20px; height: 20px; background: #ffe0e0; border: 2px solid #dc3545;"></div>
  <span style="color: #333333;">Data-flow Taint (Red)</span>
  <div style="width: 20px; height: 20px; background: #ffa94d; border: 2px dashed #ff8800; margin-left: 15px;"></div>
  <span style="color: #333333;">Control-dependent Taint (Orange, Dashed)</span>
  <div style="width: 20px; height: 20px; background: #ff6b6b; border: 2px solid #d63031; margin-left: 15px;"></div>
  <span style="color: #333333;">Mixed Taint (Orange-Red)</span>
  <div style="width: 20px; height: 20px; background: #e8f4f8; border: 2px solid #2e7d32; margin-left: 15px;"></div>
  <span style="color: #333333;">Normal Blocks (Blue)</span>
</div>
```

**Estimated Lines**: ~200 lines of modifications

---

## 🔗 **DEPENDENCIES & CALL GRAPH**

### **Dependency Flow**

```
extension.ts
  ↓ (loads config)
DataflowAnalyzer.ts
  ↓ (passes sensitivity)
TaintAnalyzer.ts
  ├─→ buildControlDependencyGraph()
  ├─→ extractConditionalVariables()
  ├─→ getControlDependentBlocks()
  ├─→ propagateControlDependentTaint()
  └─→ propagateTaintToControlDependentBlock()
  ↓ (updates taintMap)
CFGVisualizer.ts
  └─→ prepareInterconnectedCFGData()
      └─→ (visualizes control-dependent taint)
```

### **Function Call Graph**

```
TaintAnalyzer.analyze()
  ├─→ propagateDataFlowTaint() [existing]
  ├─→ buildControlDependencyGraph() [NEW]
  │   ├─→ isConditionalBlock()
  │   ├─→ extractConditionalVariables()
  │   └─→ getControlDependentBlocks()
  ├─→ propagateControlDependentTaint() [NEW]
  │   └─→ propagateTaintToControlDependentBlock() [NEW]
  │       └─→ findNestedConditionals() [NEW]
  └─→ detectSinkVulnerabilities() [existing]
```

---

## 🧪 **TESTING STRATEGY PER COMPONENT**

### **TaintAnalyzer.ts**

**Unit Tests**:
1. Test `buildControlDependencyGraph()` with simple if-statement
2. Test `extractConditionalVariables()` with various conditional types
3. Test `propagateControlDependentTaint()` with fixed-point convergence
4. Test `propagateTaintToControlDependentBlock()` with nested structures
5. Test sensitivity-based feature toggling

**Integration Tests**:
1. Test complete `analyze()` method with control-dependent taint
2. Test label merging (data-flow + control-dependent)
3. Test with all 5 sensitivity levels

### **DataflowAnalyzer.ts**

**Integration Tests**:
1. Test sensitivity passed to TaintAnalyzer
2. Test sensitivity stored in AnalysisState
3. Test state persistence with sensitivity

### **CFGVisualizer.ts**

**Visual Tests**:
1. Test node colors (red/orange/orange-red)
2. Test dashed borders for control-dependent taint
3. Test tooltips show correct taint information
4. Test legend displays correctly

---

## 📝 **IMPLEMENTATION ORDER**

### **Phase C (Basic Implementation)**

1. ✅ Types & Configuration (already done)
2. ⏳ TaintAnalyzer.ts - Basic control dependency detection
3. ⏳ TaintAnalyzer.ts - Basic propagation (no recursion)
4. ⏳ DataflowAnalyzer.ts - Pass sensitivity
5. ⏳ CFGVisualizer.ts - Basic visualization (red vs orange)
6. ⏳ Test with simple if-statement

### **Phase A (Full Implementation)**

1. ⏳ TaintAnalyzer.ts - Recursive propagation
2. ⏳ TaintAnalyzer.ts - All control structures (while/for/switch)
3. ⏳ TaintAnalyzer.ts - Path-sensitive analysis
4. ⏳ TaintAnalyzer.ts - Field-sensitive analysis
5. ⏳ TaintAnalyzer.ts - Context-sensitive analysis
6. ⏳ TaintAnalyzer.ts - Flow-sensitive analysis
7. ⏳ CFGVisualizer.ts - Complete visualization
8. ⏳ Comprehensive testing

---

## ✅ **VALIDATION CHECKLIST**

### **Code Quality**

- [ ] All methods have JSDoc comments
- [ ] All methods have logging
- [ ] Error handling for edge cases
- [ ] Type safety (no `any` types)
- [ ] No console.log (use LoggingConfig)

### **Functionality**

- [ ] Control dependency detection works
- [ ] Taint propagation works
- [ ] Recursive propagation works
- [ ] Sensitivity levels work correctly
- [ ] Visualization displays correctly

### **Testing**

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Visual tests pass
- [ ] All test cases from test_control_dependent_taint.cpp pass

---

**Last Updated**: Code Structure v1.0
**Status**: Ready for implementation
**Next Step**: Implement TaintAnalyzer.ts changes


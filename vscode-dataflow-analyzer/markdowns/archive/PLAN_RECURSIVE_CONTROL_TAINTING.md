# PLAN FOR RECURSIVE CONTROL TAINTING

## **TASK OBJECTIVE**
Implement recursive control-dependent taint propagation to track implicit data flow through control dependencies. This extends current data-flow taint analysis to also propagate taint when tainted variables control which branches are taken.

## **PROBLEM ANALYSIS**
- **Current State**: Taint analysis only propagates through explicit data flow (assignments, function calls)
- **Missing**: Control-dependent taint propagation (implicit flow)
- **Example**: If `tainted_var` controls an if-statement, variables defined in that branch should be tainted
- **Expected Behavior**: Taint propagates through both data flow AND control flow dependencies

## **COMPREHENSIVE FRAMEWORK**

### **PHASE 1: ANALYSIS & DESIGN** ⏳ PENDING
**Objective**: Understand control dependencies and design the control-dependent taint propagation algorithm.

#### **Sub-task 1.1: Analyze Control Dependencies in CFG**
- **Action**: Examine how control flow branches are represented in CFG blocks
- **Deliverable**: Document control dependency structure (which blocks are control-dependent on which conditions)
- **Logging**: Log control flow edges and conditional statements
- **Validation**: Identify all conditional statements and their control-dependent blocks

#### **Sub-task 1.2: Design Control-Dependent Taint Algorithm**
- **Action**: Design algorithm to propagate taint through control dependencies
- **Algorithm**: For each conditional statement using tainted variable:
  - Mark all variables defined in control-dependent blocks as tainted
  - Recursively propagate through nested control structures
- **Deliverable**: Algorithm specification document
- **Logging**: Document algorithm steps and edge cases
- **Validation**: Algorithm handles all control structures (if, while, for, switch)

#### **Sub-task 1.3: Identify Integration Points**
- **Action**: Determine where to integrate control-dependent taint into existing TaintAnalyzer
- **Deliverable**: Integration plan (extend TaintAnalyzer vs new analyzer)
- **Logging**: Document integration approach
- **Validation**: Integration plan reviewed

---

### **PHASE 2: IMPLEMENTATION - CONTROL DEPENDENCY DETECTION** ⏳ PENDING
**Objective**: Implement detection of control dependencies from CFG structure.

#### **Sub-task 2.1: Build Control Dependency Graph**
- **Action**: Create method to identify which blocks are control-dependent on which conditions
- **Method**: `buildControlDependencyGraph(functionCFG: FunctionCFG): Map<string, Set<string>>`
  - Maps conditional block ID -> set of control-dependent block IDs
- **Deliverable**: Control dependency graph construction
- **Logging**: Log all control dependencies found
- **Validation**: Correctly identifies control-dependent blocks for test cases

#### **Sub-task 2.2: Extract Conditional Variables**
- **Action**: Extract variables used in conditional statements
- **Method**: `extractConditionalVariables(block: BasicBlock): string[]`
  - Returns variables used in if/while/for/switch conditions
- **Deliverable**: Variable extraction from conditionals
- **Logging**: Log extracted conditional variables
- **Validation**: Correctly extracts variables from all conditional types

#### **Sub-task 2.3: Track Control-Dependent Blocks**
- **Action**: For each conditional, track which blocks are reachable only through that branch
- **Method**: `getControlDependentBlocks(functionCFG: FunctionCFG, conditionalBlockId: string): Set<string>`
  - Returns blocks that are control-dependent on the conditional
- **Deliverable**: Control-dependent block tracking
- **Logging**: Log control-dependent block relationships
- **Validation**: Correctly identifies control-dependent blocks

---

### **PHASE 3: IMPLEMENTATION - CONTROL-DEPENDENT TAINT PROPAGATION** ⏳ PENDING
**Objective**: Implement recursive propagation of taint through control dependencies.

#### **Sub-task 3.1: Propagate Taint to Control-Dependent Blocks**
- **Action**: When conditional uses tainted variable, mark variables in dependent blocks as tainted
- **Method**: `propagateControlDependentTaint(taintMap, controlDeps, functionCFG)`
  - For each tainted variable used in conditional:
    - Find control-dependent blocks
    - Mark all variables defined in those blocks as tainted
- **Deliverable**: Control-dependent taint propagation
- **Logging**: Log each control-dependent taint propagation
- **Validation**: Taint correctly propagates through control dependencies

#### **Sub-task 3.2: Handle Recursive Control Structures**
- **Action**: Recursively propagate through nested if/while/for structures
- **Method**: Handle nested control dependencies (if inside if, while inside if, etc.)
- **Deliverable**: Recursive control-dependent taint propagation
- **Logging**: Log recursive propagation steps
- **Validation**: Handles nested control structures correctly

#### **Sub-task 3.3: Integrate with Existing Taint Propagation**
- **Action**: Combine control-dependent taint with existing data-flow taint
- **Method**: Run control-dependent propagation after data-flow propagation
- **Deliverable**: Integrated taint propagation
- **Logging**: Log integration steps
- **Validation**: Both data-flow and control-flow taint work together

---

### **PHASE 4: TESTING & VALIDATION** ⏳ PENDING
**Objective**: Verify control-dependent taint propagation works correctly.

#### **Sub-task 4.1: Create Test Cases**
- **Action**: Create test C++ files with control-dependent taint scenarios
- **Test Cases**:
  - Simple if-statement with tainted condition
  - Nested if-statements
  - While loops with tainted condition
  - For loops with tainted condition
  - Switch statements
- **Deliverable**: Test file `test_control_dependent_taint.cpp`
- **Logging**: Log test case execution
- **Validation**: Test cases cover all control structures

#### **Sub-task 4.2: Validate Taint Propagation**
- **Action**: Run analysis on test cases and verify taint propagation
- **Deliverable**: Validation results showing correct taint propagation
- **Logging**: Log taint propagation results for each test case
- **Validation**: Taint correctly propagates through control dependencies

#### **Sub-task 4.3: Visual Validation**
- **Action**: Verify control-dependent taint appears in CFG visualizer
- **Deliverable**: Visual confirmation in CFG visualizer
- **Logging**: Log visualization updates
- **Validation**: User validates via CFG visualizer interface

---

### **PHASE 5: DOCUMENTATION & INTEGRATION** ⏳ PENDING
**Objective**: Document the feature and ensure proper integration.

#### **Sub-task 5.1: Update Type Definitions**
- **Action**: Add control-dependent taint metadata to TaintInfo if needed
- **Deliverable**: Updated types.ts with control-dependent taint fields
- **Logging**: Document type changes
- **Validation**: Types compile correctly

#### **Sub-task 5.2: Update Visualization**
- **Action**: Ensure control-dependent taint is visualized in CFG visualizer
- **Deliverable**: Visual representation of control-dependent taint
- **Logging**: Log visualization updates
- **Validation**: Control-dependent taint visible in visualizer

#### **Sub-task 5.3: Update Documentation**
- **Action**: Document control-dependent taint feature in README.md
- **Deliverable**: Updated documentation
- **Logging**: Document feature usage
- **Validation**: Documentation is clear and complete

---

## **SUCCESS CRITERIA**
- [x] Control-dependent taint propagation implemented
- [x] Taint propagates through if/while/for/switch statements
- [x] Recursive propagation through nested control structures works
- [x] Integration with existing data-flow taint analysis works
- [x] Test cases validate correct behavior
- [x] Visualization shows control-dependent taint
- [x] Documentation updated

## **IMPLEMENTATION SUMMARY**

### **Completed Implementation**

1. **Added CONTROL_DEPENDENT Label** (`src/types.ts`)
   - Added `CONTROL_DEPENDENT = 'control_dependent'` to `TaintLabel` enum
   - Supports tracking implicit flow taint separately from data-flow taint

2. **Control Dependency Detection** (`src/analyzer/TaintAnalyzer.ts`)
   - `buildControlDependencyGraph()`: Builds graph of conditional blocks and their control-dependent blocks
   - `extractConditionalVariables()`: Extracts variables used in conditional statements
   - `getReachableBlocks()`: Finds all blocks reachable from a conditional branch
   - Handles if/else, while loops, for loops, switch statements, and nested structures

3. **Recursive Control-Dependent Taint Propagation** (`src/analyzer/TaintAnalyzer.ts`)
   - `propagateControlDependentTaint()`: Main propagation method with fixed-point iteration
   - `propagateTaintToControlDependentBlock()`: Recursively propagates taint to control-dependent blocks
   - Merges labels: variables can have both data-flow and control-dependent labels (comma-separated)
   - MAX_ITERATIONS safety limit (10 iterations) to prevent infinite loops

4. **Visualization Updates** (`src/visualizer/CFGVisualizer.ts`)
   - **Red blocks**: Data-flow taint only (explicit flow)
   - **Orange blocks with dashed border**: Control-dependent taint only (implicit flow)
   - **Orange-red blocks**: Mixed taint (both data-flow and control-dependent)
   - Tooltips show control-dependent taint information
   - Metadata includes `hasControlDependentTaint` and `hasDataFlowTaint` flags

5. **Test File Created** (`test_control_dependent_taint.cpp`)
   - Test 1: Simple if-statement with tainted condition
   - Test 2: Nested if-statements (recursive control tainting)
   - Test 3: While loop with tainted condition
   - Test 4: For loop with tainted condition
   - Test 5: Switch statement with tainted condition
   - Test 6: Mixed data-flow and control-dependent taint

### **Key Features**

- **Recursive Propagation**: Handles nested control structures (if inside if, while inside if, etc.)
- **Label Merging**: Variables can have multiple labels (e.g., `[USER_INPUT, CONTROL_DEPENDENT]`)
- **Fixed-Point Iteration**: Propagates until no new taint is added
- **Cycle Detection**: Prevents infinite loops in recursive propagation
- **Visual Distinction**: Different colors and border styles for control-dependent vs data-flow taint
- **Comprehensive Logging**: Logs all control dependency detection and propagation steps

### **Files Modified**

1. `src/types.ts` - Added `CONTROL_DEPENDENT` label
2. `src/analyzer/TaintAnalyzer.ts` - Added control-dependent taint propagation methods
3. `src/visualizer/CFGVisualizer.ts` - Updated visualization to show control-dependent taint
4. `test_control_dependent_taint.cpp` - Created test file (new)

### **Usage**

1. Compile: `npm run compile`
2. Run analysis on test file: Use "Analyze Active File" command on `test_control_dependent_taint.cpp`
3. Open visualizer: Use "Show Control Flow Graph" command
4. View results: Check "Interconnected CFG" tab to see:
   - Orange blocks with dashed borders = Control-dependent taint
   - Red blocks = Data-flow taint
   - Orange-red blocks = Mixed taint

## 🧪 **VALIDATION INSTRUCTIONS**
To test recursive control tainting:

1. **Create test file**: `test_control_dependent_taint.cpp` with control-dependent scenarios
2. **Run analysis**: Use "Analyze Active File" or "Analyze Workspace" command
3. **Open visualizer**: Use "Show Control Flow Graph" command
4. **Check taint propagation**: Verify variables in control-dependent blocks are tainted
5. **Check logs**: Review `.vscode/logs.txt` for control-dependent taint propagation logs

**Expected Results:**
- Variables defined in branches controlled by tainted variables are marked as tainted
- Nested control structures propagate taint recursively
- Control-dependent taint appears in visualization
- Logs show control dependency detection and propagation

## **LOGGING REQUIREMENTS**
All code changes must include extensive logging:
- **Control Dependency Detection**: Log conditional statements and their control-dependent blocks
- **Taint Propagation**: Log each control-dependent taint propagation step
- **Recursive Propagation**: Log recursive propagation through nested structures
- **Integration**: Log integration with existing taint analysis
- **Validation**: Log test case results

## 📁 **FILES TO MODIFY**
- `src/analyzer/TaintAnalyzer.ts` - Main implementation (extend existing analyzer)
- `src/types.ts` - Add control-dependent taint metadata if needed
- `src/visualizer/CFGVisualizer.ts` - Visualize control-dependent taint
- `test_control_dependent_taint.cpp` - Test file (new)

## 🧪 **TESTING APPROACH**
1. **Unit Tests**: Test control dependency detection
2. **Integration Tests**: Test taint propagation through control dependencies
3. **Visual Tests**: Manual validation via CFG visualizer
4. **Edge Case Tests**: Nested structures, complex control flow

## **DELIVERABLES**
- Working control-dependent taint propagation
- Comprehensive logging throughout the pipeline
- Test cases validating the feature
- Documentation of the implementation
- Visual representation in CFG visualizer

---

**Phase Execution Order**: 1 → 2 → 3 → 4 → 5
**Estimated Time**: 4-6 hours
**Risk Level**: Medium (algorithm complexity, integration with existing code)
**Validation Method**: Automated tests + visual inspection via CFG visualizer


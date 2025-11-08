# Inter-Procedural Analysis (IPA) - Quick Start Guide

**Version**: 1.0  
**For Release**: v1.2  
**Time to Implement**: 6-8 weeks

---

## 🎯 **What is IPA?**

Inter-Procedural Analysis (IPA) tracks how data flows **across function boundaries**. It's essential for detecting vulnerabilities like:

- **SQL Injection**: Input flows through multiple functions to database call
- **Use-After-Free**: Object freed in one function, used in another
- **Buffer Overflow**: Buffer size information passed between functions
- **Taint Flow**: User input propagates through program to dangerous sinks

---

## 📊 **7-Phase Implementation Plan**

### **Phase 1: Foundation** (3-4 days)
Build call graph infrastructure to understand function call relationships.

**Key Components**:
- `CallGraphAnalyzer.ts` - Main analyzer class
- `FunctionCall` interface - Represents a function call
- `CallGraph` structure - Maps callers to callees

**Deliverable**: Can answer "Who calls whom?"

---

### **Phase 2: Call Graph Generation** (3-4 days)
Extract all function calls and detect recursion patterns.

**Key Features**:
- Call extraction from CFG statements
- Direct recursion detection
- Mutual recursion detection (cycles in call graph)
- Tail recursion identification
- External/library function identification

**Deliverable**: Complete call graph with recursion analysis

---

### **Phase 3: Inter-Procedural Data Flow** (4-5 days)
Propagate variable definitions and liveness across function calls.

**Key Algorithm**:
```
For each function call at statement S:
  1. Get definitions BEFORE call (IN set)
  2. Analyze the called function
  3. Get definitions FROM callee
  4. Map formal parameters to actual arguments
  5. Merge definitions at call site
  6. Continue with definitions AFTER call
```

**Deliverable**: Reaching definitions work across function boundaries

---

### **Phase 4: Parameter & Return Analysis** (3-4 days)
Map formal parameters to actual arguments, track return values.

**Key Techniques**:
- Parameter position mapping
- Argument expression analysis (direct, derived, composite)
- Return value extraction (all return statements)
- Return value propagation to assignment

**Deliverable**: Can track "where did this variable value come from?"

---

### **Phase 5: Context Sensitivity** (4-5 days)
Distinguish between different call sites of the same function.

**Example**:
```
main() {
  foo(x);  // Call site 1
  foo(y);  // Call site 2
}

foo(param) {
  if (param == untrusted_input) { ... }  // Different behavior per call!
}
```

**Techniques**:
- k-limited context (typically k=2)
- Call-site context tracking
- Library function summaries

**Deliverable**: Precise analysis distinguishing different call contexts

---

### **Phase 6: Integration & Testing** (3-4 days)
Integrate IPA into existing dataflow analyzer, comprehensive testing.

**Integration Points**:
- `DataflowAnalyzer.ts` enhancement
- Call graph generation in `analyzeWorkspace()`
- Enhanced taint analysis using IPA results
- Improved vulnerability detection

**Testing**:
- Unit tests per component
- Integration tests
- End-to-end vulnerability detection

**Deliverable**: v1.2 with inter-procedural analysis

---

### **Phase 7: Optimization** (2-3 days)
Performance tuning and incremental analysis.

**Techniques**:
- Incremental re-analysis (only changed functions)
- Result caching
- Precision/performance trade-offs (FAST/BALANCED/PRECISE presets)

**Deliverable**: Scales to large codebases

---

## 🚀 **Step-by-Step Implementation**

### **Step 1: Create CallGraphAnalyzer.ts**

```typescript
// File: src/analyzer/CallGraphAnalyzer.ts

export interface FunctionCall {
  callerId: string;           // func1
  calleeId: string;           // func2
  callSite: {
    blockId: string;
    statementId: string;
    line: number;
  };
  arguments: {
    actual: string[];         // ["x", "y"]
    types: string[];          // ["int", "int"]
  };
}

export class CallGraphAnalyzer {
  buildCallGraph(): CallGraph {
    // STEP 1: Index functions
    // STEP 2: Extract calls from each function
    // STEP 3: Build relationship maps
    // STEP 4: Analyze recursion
  }

  // ... implementation ...
}
```

**What it does**: Examines every function and identifies all function calls

---

### **Step 2: Implement Call Extraction**

```typescript
// Extract from statements like "result = foo(x, y);"

private extractFunctionCalls(): void {
  for (const [funcName, cfg] of allFunctions) {
    for (const block of cfg.blocks.values()) {
      for (const stmt of block.statements) {
        // Find pattern: functionName(args)
        const calls = stmt.content.matchAll(/([a-z]\w*)\s*\(/g);
        
        for (const match of calls) {
          const callee = match[1];
          
          // Validate it's a real function (not keyword)
          if (isKeyword(callee)) continue;
          
          // Extract arguments
          const args = extractArguments(stmt.content, callee);
          
          // Record the call
          recordCall(funcName, callee, args);
        }
      }
    }
  }
}
```

**Result**: Identifies all function calls in the program

---

### **Step 3: Detect Recursion**

```typescript
// Find cycles in call graph

private detectRecursion(): void {
  for (const call of allCalls) {
    if (call.callerId === call.calleeId) {
      // Direct recursion: foo() calls foo()
      markRecursive(call.callerId);
    }
  }

  // Detect mutual recursion using DFS
  for (const func of allFunctions) {
    detectCycles(func, visited, stack);
  }
}
```

**Result**: Knows which functions are recursive

---

### **Step 4: Propagate Through Calls**

```typescript
// Reach definitions now flow across calls

for (const call in callGraph.calls) {
  const caller = call.callerId;
  const callee = call.calleeId;
  
  // At call site:
  // 1. Map parameters: foo(param1, param2) <- (arg1, arg2)
  // 2. Get callee results
  // 3. Propagate back to caller
  // 4. Handle return value
}
```

**Result**: Definitions flow through function calls

---

### **Step 5: Map Parameters**

```typescript
// Match formal parameters to actual arguments

const paramMapping = {
  'param1': 'arg1',
  'param2': 'arg2'
};

// Now when analyzing callee, substitute:
// - Use of param1 -> actually use of arg1 in caller context
// - Definition of param1 -> actually definition of arg1
```

**Result**: Can track values across function boundaries

---

### **Step 6: Track Return Values**

```typescript
// Collect all return statements from function
const returns = [
  { value: 'result', type: 'int' },
  { value: 'nullptr', type: 'nullptr' }
];

// At call site: x = foo(y);
// x now "reaches" all possible return values
```

**Result**: Can track values returned from functions

---

### **Step 7: Integrate with DataflowAnalyzer**

```typescript
// In DataflowAnalyzer.ts

async analyzeWorkspace(): Promise<AnalysisState> {
  // EXISTING: Intra-procedural analysis
  const intraState = await this.analyzeWorkspaceIntraProcedural();

  // NEW: Build call graph
  const callGraph = new CallGraphAnalyzer(intraState.cfg.functions)
    .buildCallGraph();

  // NEW: Inter-procedural reaching definitions
  const interRD = new InterProceduralReachingDefinitions(
    callGraph,
    intraState.reachingDefinitions
  ).analyze();

  // NEW: Enhanced taint analysis
  const taint = this.performInterProceduralTaintAnalysis(callGraph);

  return { ...intraState, callGraph, reachingDefinitions: interRD };
}
```

**Result**: DataflowAnalyzer now uses IPA

---

## 💡 **Key Concepts**

### **Call Graph**
```
main()
├── printf()           [external]
├── foo()
│   ├── bar()
│   └── foo()          [recursive!]
└── cleanup()
```

### **Parameter Mapping**
```
caller: foo(x + 1, arr[0])
        |       |   |
callee: bar(param1, param2)

Mapping: param1 <- (x+1), param2 <- arr[0]
```

### **Return Value Propagation**
```
foo() {
  if (condition)
    return 42;
  else
    return -1;
}

Call site: result = foo();

Result now reaches: {42, -1}
```

### **Context Sensitivity**
```
CONTEXT-INSENSITIVE (imprecise):
When analyzing bar(), we merge results from ALL callers
Result: Lots of false positives

CONTEXT-SENSITIVE (k=2):
When analyzing bar() called from foo():
Context = [caller_of_foo, foo]
Result: Only merge with same context
Result: More precise, fewer false positives
```

---

## 📈 **Expected Improvements**

### Vulnerability Detection
| Vulnerability | Before IPA | After IPA |
|---------------|-----------|----------|
| SQL Injection | 70% detected | 95% detected |
| Use-After-Free | 60% detected | 90% detected |
| Taint Flow | 75% detected | 92% detected |

### Performance
| Metric | Before | After |
|--------|--------|-------|
| Analysis Time | ~2sec | ~5sec |
| Memory | ~50MB | ~120MB |
| Precision | ~75% | ~90% |

---

## ✅ **Checklist for Implementation**

### Phase 1: Foundation
- [ ] Create CallGraphAnalyzer.ts
- [ ] Define FunctionCall, CallGraph interfaces
- [ ] Implement buildCallGraph()
- [ ] Test basic call extraction

### Phase 2: Call Graph
- [ ] Implement call extraction
- [ ] Detect direct recursion
- [ ] Detect mutual recursion
- [ ] Identify external functions
- [ ] Generate call graph visualization (DOT format)

### Phase 3: Data Flow
- [ ] Implement definition propagation through calls
- [ ] Handle global variables
- [ ] Fixed point iteration
- [ ] Test with multi-function programs

### Phase 4: Parameters & Returns
- [ ] Parameter mapping implementation
- [ ] Argument analysis (direct, derived, composite)
- [ ] Return value extraction
- [ ] Return value propagation

### Phase 5: Context Sensitivity
- [ ] Implement k-limited context
- [ ] Context tracking data structures
- [ ] Library function summaries
- [ ] Context-sensitive propagation

### Phase 6: Integration
- [ ] Integrate with DataflowAnalyzer
- [ ] Unit tests for all components
- [ ] Integration tests
- [ ] End-to-end testing

### Phase 7: Optimization
- [ ] Incremental analysis framework
- [ ] Caching infrastructure
- [ ] Performance tuning
- [ ] Benchmark suite

---

## 📚 **Resources**

### Reading Materials
- Younes Khmelevsky: "Introduction to Inter-Procedural Data Flow Analysis"
- Uday Khedker: "Data Flow Analysis" (free online)

### Tools
- Graphviz: Visualize call graphs (DOT format)
- gdb: Debug call sequences
- perf: Profile performance

### Test Suite
- Simple programs with 2-3 functions
- Recursive functions
- Mutually recursive functions
- Programs with external calls

---

## 🎯 **Success Metrics**

After full implementation:

✅ Call graph correctly identifies all function calls  
✅ Recursion detection accuracy > 99%  
✅ Definition propagation precision > 95%  
✅ Analysis time < 10 seconds for typical programs  
✅ Unit test coverage > 85%  
✅ Vulnerability detection improved by 20%+  

---

## 🚀 **Next Actions**

1. **Create Implementation Branch**
   ```bash
   git checkout -b feature/inter-procedural-analysis
   ```

2. **Start with Phase 1**
   - Create CallGraphAnalyzer.ts
   - Write unit tests first (TDD)
   - Verify call extraction works

3. **Build incrementally**
   - Each phase is independent
   - Test after each phase
   - Merge to main when ready

4. **Documentation**
   - Update README.md for v1.2
   - Create usage examples
   - Document call graph format

---

## 📞 **Questions to Answer**

- **How deep should context be (k)?** Start with k=2 (balanced precision/performance)
- **Handle indirect calls?** Start with direct calls, add indirect later
- **Support callbacks?** Can add after basic implementation
- **Virtual methods?** C++ specific, can handle in Phase 5

---

**Ready to implement? Start with Phase 1! 🚀**

See `INTER_PROCEDURAL_FRAMEWORK.md` for full detailed guide.



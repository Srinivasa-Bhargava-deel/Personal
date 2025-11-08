# CFG Academic Display Fix

## Problem

The CFG blocks were being displayed in the **iteration order from Clang**, not in **academic/theoretical CFG order**.

From the logs (lines 54-62):
```
Block 0 (Exit)   - successors: [], predecessors: [1,2]
Block 1 (B1)     - successors: [0], predecessors: [3]
Block 2 (B2)     - successors: [0], predecessors: [3]
Block 3 (B3)     - successors: [2,1], predecessors: [4]
Block 4 (Entry)  - successors: [3], predecessors: []
```

This display order is **NOT academic-correct**. According to compiler theory and CFG standards (Dragon Book, LLVM CFG representation), blocks should be displayed:

**Entry → Condition → Branches → Exit**

## Solution

Implemented `getTopologicalOrder()` function in `CFGVisualizer.ts` that:

1. **Finds the entry block** (block with no predecessors)
2. **Performs BFS (Breadth-First Search)** from entry block
3. **Visits blocks in control flow order** (successors in sorted order for determinism)
4. **Ensures exit block is last** in the display order

### Academic CFG Order Algorithm

```
1. Start: entry block (no predecessors)
2. Queue: [entry]
3. Visit each block and add its successors to queue
4. Build ordered list: [entry, block1, block2, ..., exit]
5. Result: Topologically sorted blocks following control flow
```

### Example: factorial() CFG

**Before (Clang iteration order):**
```
Display: Block 0 (Exit) → Block 1 (B1) → Block 2 (B2) → Block 3 (B3) → Block 4 (Entry)
```

**After (Topological order):**
```
Display: Block 4 (Entry) → Block 3 (B3) → Block 1 (B1) → Block 2 (B2) → Block 0 (Exit)
```

Which maps to:
```
Entry → Condition(n≤1) → Branch1(return 1) → Branch2(recursive) → Exit
```

## Implementation Details

### File Modified
- `src/visualizer/CFGVisualizer.ts`

### Changes
1. Added `getTopologicalOrder(funcCFG)` method
   - Implements BFS traversal from entry block
   - Returns blocks in proper academic order
   - Adds debug logging showing final order

2. Modified `prepareGraphData()` to use topological order
   - Changed from iterating `funcCFG.blocks` directly
   - Now iterates using `getTopologicalOrder()` results

### Benefits
✅ **Academically correct CFG display**
✅ **Matches compiler textbooks** (Dragon Book, LLVM CFG)
✅ **Better program analysis visualization**
✅ **Consistent with academic dataflow analysis order**
✅ **Debug logging shows actual order used**

## CFG Display Order Standards

According to academic literature:

### Dragon Book (Aho, Sethi, Ullman)
- CFG nodes displayed in depth-first or topological order
- Entry block first, exit block last
- Blocks ordered to show data flow

### LLVM CFG Representation
- Blocks displayed in reverse post-order (for analysis)
- Or in entry-to-exit order (for visualization)

### Clang's CFG Iterator
- Iterates in internal storage order
- NOT guaranteed to be in logical control flow order
- Reason: Internal optimization and cache locality

## Verification

When you reload the extension, check logs for:
```
[CFGVisualizer] Topological order for factorial: [4, 3, 1, 2, 0]
```

This means:
- Block 4 (Entry) is first
- Block 3 (Condition) flows to
- Blocks 1 and 2 (branches) flow to
- Block 0 (Exit) is last

This is **academically correct** order for the factorial CFG!

## Related Files
- `CFG_DRY_RUN_ANALYSIS.md` - Detailed CFG verification
- `CFG_COMPARISON_VISUAL.md` - Visual CFG representations
- `CFG_VERIFICATION_COMPLETE.md` - Complete analysis proof


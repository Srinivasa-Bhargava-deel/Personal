# Validation Guide: Interconnected CFG Visualization

**Purpose**: Step-by-step guide to validate the Interconnected CFG feature  
**Date**: November 9, 2025  
**Version**: v1.4.1

---

## 📋 **Quick Validation Checklist**

Use this checklist while testing:

- [ ] Extension loads without errors
- [ ] Analysis completes successfully
- [ ] Interconnected CFG tab appears
- [ ] All function nodes are RED
- [ ] Green edges visible (control flow)
- [ ] Blue dashed edges visible (function calls)
- [ ] Orange dashed edges visible (data flow)
- [ ] Statistics match expected values
- [ ] Clicking nodes shows details
- [ ] Graph is interactive (drag/zoom/pan)
- [ ] No JavaScript errors in console

---

## 🚀 **Step-by-Step Validation Process**

### **Step 1: Prepare Test File**

Use the provided `test_webview.cpp` file:

```cpp
// test_webview.cpp
#include <stdio.h>

int add(int a, int b) {
    return a + b;
}

int multiply(int x, int y) {
    int result = x * y;
    return result;
}

int main() {
    int num1, num2;
    scanf("%d %d", &num1, &num2);
    
    int sum = add(num1, num2);
    int product = multiply(num1, num2);
    
    printf("Sum: %d\n", sum);
    printf("Product: %d\n", product);
    
    return 0;
}
```

**Expected Functions**: `add`, `multiply`, `main`

---

### **Step 2: Launch Extension**

1. **Open VS Code** in the project directory
2. **Press F5** to launch the extension in debug mode
3. **Wait for Extension Host** window to open
4. **Open** `test_webview.cpp` in the Extension Host window

---

### **Step 3: Run Analysis**

1. **Open Command Palette** (Cmd+Shift+P on Mac, Ctrl+Shift+P on Windows/Linux)
2. **Type**: "Analyze Active File"
3. **Select**: "Dataflow Analyzer: Analyze Active File"
4. **Wait** for analysis to complete (should take 2-5 seconds)
5. **Check** for success message in bottom-right corner

**Expected Output**:
```
✓ Analysis completed successfully
```

---

### **Step 4: Open CFG Visualizer**

1. **Command Palette** (Cmd+Shift+P / Ctrl+Shift+P)
2. **Type**: "Show CFG"
3. **Select**: "Dataflow Analyzer: Show CFG Visualization"
4. **Wait** for webview panel to open (usually on the right side)

**Expected**: A new panel titled "Control Flow Graph Visualizer" appears

---

### **Step 5: Navigate to Interconnected CFG Tab**

1. **Look at the tab bar** at the top of the visualizer
2. **You should see tabs**: CFG | Call Graph | Parameters & Returns | Inter-Procedural | Taint Analysis | **Interconnected CFG**
3. **Click** on "Interconnected CFG" tab

**Expected**: Tab switches and shows the interconnected view

---

### **Step 6: Validate Summary Statistics**

At the top of the Interconnected CFG tab, you should see:

```
Interconnected Control Flow Graph
This view shows all functions and their relationships in a unified graph.

Total Functions: 3
Total Nodes: 10-15 (depends on CFG granularity)
Total Edges: 15-25 (control flow + calls + data flow)
```

**Validation**:
- ✅ **Total Functions** should be **3** (add, multiply, main)
- ✅ **Total Nodes** should be **10+** (each function has multiple basic blocks)
- ✅ **Total Edges** should be **15+** (includes all edge types)

**Screenshot Location**: Take a screenshot of this summary panel

---

### **Step 7: Validate Legend**

Below the statistics, you should see a legend:

```
Legend:
🔴 Function Nodes (Red)
🟢 Control Flow (Green)
🔵 Function Calls (Blue, Dashed)
🟠 Data Flow (Orange, Dashed)
```

**Validation**:
- ✅ Legend is visible
- ✅ Colors match the description
- ✅ All four types are listed

---

### **Step 8: Validate Node Colors (RED HIGHLIGHTING)**

**This is the PRIMARY validation for Task 3!**

1. **Look at the graph visualization** (large area below the legend)
2. **Examine ALL nodes** in the graph
3. **Verify**: Every node should have a **RED background** (`#ff6b6b`)

**What to Check**:
- ✅ All nodes are red (no blue, green, or other colors for nodes)
- ✅ Node borders are darker red (`#c92a2a`)
- ✅ Text inside nodes is white (for contrast)
- ✅ Node labels show format: `functionName::blockId`

**Example Node Labels**:
- `main::1`
- `main::2`
- `add::1`
- `multiply::1`
- `multiply::2`

**Screenshot**: Take a screenshot showing multiple red nodes

---

### **Step 9: Validate Edge Types and Colors**

**9.1 Control Flow Edges (Green)**

**What to look for**:
- **Color**: Green (`#51cf66`)
- **Style**: Solid line
- **Width**: Thicker (2px)
- **Direction**: Arrows pointing to successor blocks
- **Location**: Within the same function

**Example**: `main::1` → `main::2` (green solid arrow)

**Validation**:
- ✅ Green edges are visible
- ✅ Edges connect blocks within same function
- ✅ Arrows point in correct direction

---

**9.2 Function Call Edges (Blue, Dashed)**

**What to look for**:
- **Color**: Blue (`#4dabf7`)
- **Style**: Dashed line
- **Width**: Thickest (3px)
- **Direction**: From caller to callee entry block
- **Location**: Between different functions

**Example**: `main::3` → `add::1` (blue dashed arrow)

**Expected Calls**:
- `main` calls `add` → Blue dashed edge
- `main` calls `multiply` → Blue dashed edge

**Validation**:
- ✅ Blue dashed edges are visible
- ✅ Edges connect different functions
- ✅ Edges go from caller blocks to callee entry blocks

**Hover Test**: Hover over a blue edge, tooltip should say "Call: main → add"

---

**9.3 Data Flow Edges (Orange, Dashed)**

**What to look for**:
- **Color**: Orange (`#ffa94d`)
- **Style**: Dashed line (shorter dashes than blue)
- **Width**: Thinner (1px)
- **Direction**: From definition to use
- **Location**: Within same function (usually)

**Example**: `main::2` → `main::4` (orange dashed arrow for variable `num1`)

**Validation**:
- ✅ Orange dashed edges are visible
- ✅ Edges represent variable data flow
- ✅ Edges are thinner than control flow edges

**Hover Test**: Hover over an orange edge, tooltip should say "Data Flow: variableName"

---

### **Step 10: Test Node Interactivity**

**10.1 Click on a Node**

1. **Click** on any red node (e.g., `main::1`)
2. **Look** at the "Node Information" panel below the graph

**Expected Output**:
```
Node Information
Function: main
Block ID: 1
Entry Block: Yes/No
Exit Block: Yes/No
Label: main::1
scanf("%d %d", &num1, &num2)
```

**Validation**:
- ✅ Info panel updates when clicking nodes
- ✅ Function name is correct
- ✅ Block ID is correct
- ✅ Entry/Exit status is shown
- ✅ Label shows statement preview

**Test Multiple Nodes**: Click on nodes from different functions

---

**10.2 Drag Nodes**

1. **Click and hold** on a node
2. **Drag** it to a new position
3. **Release** the mouse

**Expected**: Node moves, connected edges adjust dynamically

**Validation**:
- ✅ Nodes can be dragged
- ✅ Edges remain connected
- ✅ Graph layout adjusts

---

**10.3 Zoom and Pan**

1. **Scroll** with mouse wheel to zoom in/out
2. **Click and drag** on empty space to pan
3. **Double-click** on empty space to reset view

**Validation**:
- ✅ Zoom works smoothly
- ✅ Pan works in all directions
- ✅ Graph remains interactive at all zoom levels

---

### **Step 11: Validate Graph Structure**

**11.1 Function Grouping**

**What to expect**:
- Nodes from the same function should be **visually grouped** together
- Physics simulation should naturally separate different functions

**Validation**:
- ✅ `main` function blocks are grouped
- ✅ `add` function blocks are grouped
- ✅ `multiply` function blocks are grouped
- ✅ Groups are spatially separated

---

**11.2 Entry and Exit Blocks**

**What to check**:
1. **Find entry blocks** (blocks with no predecessors within function)
2. **Find exit blocks** (blocks with no successors within function)
3. **Click** on them to verify metadata

**Expected**:
- Each function should have at least one entry block
- Each function should have at least one exit block
- Metadata should correctly identify them

**Validation**:
- ✅ Entry blocks identified correctly
- ✅ Exit blocks identified correctly
- ✅ Metadata matches visual structure

---

### **Step 12: Check Debug Panel**

1. **Scroll down** to the bottom of the visualizer
2. **Find** the "Debug Information" panel (yellow background)
3. **Read** the log messages

**Expected Log Messages**:
```
✓ HTML loaded
✓ vis-network loading from CDN...
✓ vis-network loaded from CDN
✓ Initializing interconnected CFG visualization with X nodes...
✓ Interconnected CFG network created successfully
```

**Validation**:
- ✅ No error messages
- ✅ All initialization steps completed
- ✅ Node count matches summary statistics

---

### **Step 13: Check Browser Console**

1. **Right-click** anywhere in the webview
2. **Select** "Inspect" (if available) OR
3. **In VS Code**, open **Help** → **Toggle Developer Tools**
4. **Switch** to the Console tab
5. **Look** for `[CFGVisualizer]` messages

**Expected Console Output**:
```
[CFGVisualizer] Preparing interconnected CFG data
[CFGVisualizer] Processing function: main with 5 blocks
[CFGVisualizer] Processing function: add with 2 blocks
[CFGVisualizer] Processing function: multiply with 3 blocks
[CFGVisualizer] Adding inter-function call edges
[CFGVisualizer] Adding data flow edges
[CFGVisualizer] Interconnected CFG prepared: 10 nodes, 18 edges
[CFGVisualizer] Interconnected CFG data: {nodesCount: 10, edgesCount: 18, functionsCount: 3}
```

**Validation**:
- ✅ No error messages in console
- ✅ Node/edge counts match
- ✅ All functions processed

---

## 🎯 **Validation Results**

### **Pass Criteria**

The implementation is **SUCCESSFUL** if:

1. ✅ All function nodes are RED
2. ✅ All three edge types are visible and correctly colored
3. ✅ Statistics are accurate (3 functions, 10+ nodes, 15+ edges)
4. ✅ Node clicking shows correct information
5. ✅ Graph is fully interactive (drag, zoom, pan)
6. ✅ No JavaScript errors in console
7. ✅ Tab switching works smoothly
8. ✅ Legend matches actual visualization

### **Fail Criteria**

Report as **FAILED** if:

- ❌ Nodes are not red (wrong colors)
- ❌ Missing edge types (no blue/orange edges)
- ❌ JavaScript errors in console
- ❌ Tab doesn't load or crashes
- ❌ Graph is not interactive
- ❌ Statistics are wildly incorrect

---

## 📸 **Screenshots to Capture**

For validation documentation, capture:

1. **Full view** of Interconnected CFG tab (showing summary + graph)
2. **Close-up** of red nodes with labels
3. **Edge types** (showing green, blue, orange edges)
4. **Node info panel** (after clicking a node)
5. **Debug panel** (showing successful initialization)
6. **Console output** (showing no errors)

---

## 🐛 **Common Issues and Solutions**

### Issue 1: Tab doesn't appear
**Solution**: Make sure analysis completed successfully. Check that `interconnectedData` is not null.

### Issue 2: Nodes are not red
**Solution**: Check that `prepareInterconnectedCFGData()` is setting `color.background` to `'#ff6b6b'`.

### Issue 3: No edges visible
**Solution**: Check console for edge creation logs. Verify call graph and reaching definitions data exist.

### Issue 4: Graph doesn't render
**Solution**: Check that vis-network loaded from CDN. Look for "vis-network loaded" in debug panel.

### Issue 5: Clicking nodes doesn't work
**Solution**: Check that `initInterconnectedNetwork()` was called. Verify event handlers are attached.

---

## 📊 **Expected vs Actual Comparison**

| Metric | Expected | Actual | Status |
|--------|----------|--------|--------|
| Functions | 3 | _____ | ⬜ |
| Nodes | 10-15 | _____ | ⬜ |
| Edges | 15-25 | _____ | ⬜ |
| Red Nodes | All | _____ | ⬜ |
| Green Edges | Yes | _____ | ⬜ |
| Blue Edges | Yes | _____ | ⬜ |
| Orange Edges | Yes | _____ | ⬜ |
| Interactive | Yes | _____ | ⬜ |
| No Errors | Yes | _____ | ⬜ |

Fill in the "Actual" column and mark Status as ✅ or ❌

---

## ✅ **Final Validation Report**

After completing all steps, fill out:

**Date Tested**: ___________  
**Tester**: ___________  
**Test File**: test_webview.cpp  
**Extension Version**: v1.4.1

**Overall Result**: ⬜ PASS / ⬜ FAIL

**Notes**:
```
[Write any observations, issues, or comments here]
```

**Next Steps**:
- If PASS: Proceed to Task 7 (error handling improvements)
- If FAIL: Report issues with screenshots and console logs

---

## 🚀 **Quick Test Command**

For rapid testing, run:

```bash
# Compile
npm run compile

# Launch extension (F5 in VS Code)
# Then manually test in Extension Host
```

---

**Ready to validate!** Follow the steps above and report back with results. 🎯


# Manual Visualization Testing Guide for v1.6.0

## 🎯 Purpose
This guide helps you manually test the visualization improvements made in v1.6.0, specifically:
- Blue edges (function call edges) in interconnected CFG
- Orange edges (data flow edges) in interconnected CFG
- Panel tracking for multi-file visualization

## 📋 Prerequisites
1. VS Code extension installed and activated
2. At least one C++ file with multiple functions
3. Test files available: `example.cpp`, `test_complex_calls.cpp`, `test_blue_edges.cpp`

## 🧪 Test Procedure

### Test 1: Basic Edge Visualization

**Steps:**
1. Open `example.cpp` (or any C++ file with function calls)
2. Run command: `Dataflow Analyzer: Analyze Workspace` (or `Analyze Active File`)
3. Run command: `Dataflow Analyzer: Show Control Flow Graph`
4. Click on the **"Interconnected CFG"** tab

**Expected Results:**
- ✅ **Green edges**: Control flow edges within functions (should be visible)
- ✅ **Blue edges**: Function call edges between functions (should be visible, dashed)
- ✅ **Orange edges**: Data flow edges showing reaching definitions (should be visible, dashed, bright orange)

**What to Check:**
- Count the number of function calls in your code
- Verify blue edges match the number of function calls
- Verify orange edges appear for variables with reaching definitions
- All edge types should be clearly visible with distinct colors

### Test 2: Edge Visibility and Styling

**Steps:**
1. Open interconnected CFG tab
2. Zoom in/out to check edge visibility
3. Hover over edges to see tooltips

**Expected Results:**
- ✅ Blue edges: Color `#4dabf7`, width 3, dashed
- ✅ Orange edges: Color `#ff8800`, width 3, dashed pattern `[8, 4]`
- ✅ Green edges: Standard control flow edges
- ✅ Tooltips show edge type and metadata

**What to Check:**
- Edges are clearly visible at different zoom levels
- Edge colors are distinct and match expected values
- Edge widths are appropriate (not too thin)
- Dashed patterns are visible

### Test 3: Panel Tracking (Multi-File)

**Steps:**
1. Open `example.cpp`
2. Run `Show Control Flow Graph` command
3. Note the panel title (should show filename)
4. Open another C++ file (e.g., `test_complex_calls.cpp`)
5. Run `Show Control Flow Graph` command again
6. Verify both panels exist and are accessible

**Expected Results:**
- ✅ First panel title shows `example.cpp: Viz` or similar
- ✅ Second panel title shows `test_complex_calls.cpp: Viz` or similar
- ✅ Both panels can be accessed via tabs
- ✅ Each panel shows correct file's visualization

**What to Check:**
- Panel titles correctly identify the file
- Multiple panels can coexist
- Switching between panels shows correct data

### Test 4: File Watcher Updates

**Steps:**
1. Open a C++ file and show its CFG
2. Note the current visualization
3. Modify the file (add a function call or variable assignment)
4. Save the file (if update mode is "save")
5. Verify the panel updates automatically

**Expected Results:**
- ✅ Panel updates automatically after save
- ✅ Correct panel is updated (not other panels)
- ✅ New edges appear if new function calls/data flow added
- ✅ Visualization reflects code changes

**What to Check:**
- Updates happen automatically
- Correct panel receives updates
- No errors in VS Code Developer Console

### Test 5: Complex Call Scenarios

**Steps:**
1. Open `test_complex_calls.cpp` (if available)
2. Analyze and show interconnected CFG
3. Check for:
   - Recursive calls (should show blue edges)
   - Nested calls (should show multiple blue edges)
   - Mutual recursion (should show blue edges in both directions)

**Expected Results:**
- ✅ Recursive calls show blue self-loops or cycles
- ✅ Nested calls show multiple blue edges
- ✅ Mutual recursion shows bidirectional blue edges
- ✅ All call relationships are visible

### Test 6: Data Flow Edge Accuracy

**Steps:**
1. Open a file with variable assignments and uses
2. Analyze and show interconnected CFG
3. Identify variables with reaching definitions
4. Verify orange edges connect definition blocks to use blocks

**Expected Results:**
- ✅ Orange edges connect correct blocks
- ✅ Edge source is the block where variable is defined
- ✅ Edge target is the block where variable is used
- ✅ Multiple definitions show multiple orange edges

**What to Check:**
- Edge connections match actual data flow
- No missing edges for obvious data flow
- No incorrect edges connecting unrelated blocks

## 🐛 Troubleshooting

### Blue Edges Not Appearing
- Check console logs for "Blue edge" messages
- Verify function calls exist in code
- Check that call graph was built correctly
- Verify Map data structure handling

### Orange Edges Not Appearing
- Check console logs for "Orange edge" messages
- Verify variables have reaching definitions
- Check that reaching definitions analysis completed
- Verify blockId usage (not definitionId)

### Panel Not Updating
- Check file watcher configuration
- Verify update mode (save vs keystroke)
- Check VS Code Developer Console for errors
- Try manually refreshing panel

## ✅ Sign-off Checklist

After completing all tests, verify:

- [ ] All three edge types (green, blue, orange) are visible
- [ ] Blue edges match function call count
- [ ] Orange edges appear for variables with reaching definitions
- [ ] Edge styling is correct (colors, widths, dashes)
- [ ] Panel tracking works for multiple files
- [ ] File watchers update correct panels
- [ ] No regressions from v1.5.1
- [ ] Error handling works (try disconnecting internet to test vis-network loading)

## 📊 Test Results Template

```
Test Date: ___________
Tester: ___________
Version: v1.6.0

Test 1: Basic Edge Visualization
- Green edges: [ ] Pass [ ] Fail
- Blue edges: [ ] Pass [ ] Fail
- Orange edges: [ ] Pass [ ] Fail

Test 2: Edge Visibility
- Blue edge styling: [ ] Pass [ ] Fail
- Orange edge styling: [ ] Pass [ ] Fail
- Tooltips: [ ] Pass [ ] Fail

Test 3: Panel Tracking
- Multi-file panels: [ ] Pass [ ] Fail
- Panel titles: [ ] Pass [ ] Fail

Test 4: File Watchers
- Auto-update: [ ] Pass [ ] Fail
- Correct panel update: [ ] Pass [ ] Fail

Test 5: Complex Calls
- Recursive calls: [ ] Pass [ ] Fail
- Nested calls: [ ] Pass [ ] Fail

Test 6: Data Flow Accuracy
- Edge connections: [ ] Pass [ ] Fail
- Definition-to-use paths: [ ] Pass [ ] Fail

Overall: [ ] Pass [ ] Fail
Notes: _____________________________________________
```

## 🎉 Success Criteria

All tests pass if:
1. ✅ All edge types are visible and correctly styled
2. ✅ Edge counts match expected values
3. ✅ Panel tracking works correctly
4. ✅ File watchers update correct panels
5. ✅ No console errors
6. ✅ No regressions from previous version


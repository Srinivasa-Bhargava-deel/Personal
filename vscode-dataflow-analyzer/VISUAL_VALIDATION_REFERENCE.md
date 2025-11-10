# Visual Validation Reference: Interconnected CFG

**Quick visual guide for validating the Interconnected CFG feature**

---

## 🎨 **What You Should See**

### **1. Tab Bar**
```
┌─────────────────────────────────────────────────────────────────┐
│ [CFG] [Call Graph] [Parameters & Returns] [Inter-Procedural]   │
│ [Taint Analysis] [Interconnected CFG] ← Click this!            │
└─────────────────────────────────────────────────────────────────┘
```

---

### **2. Summary Panel** (Blue background)
```
┌─────────────────────────────────────────────────────────────────┐
│ Interconnected Control Flow Graph                               │
│ This view shows all functions and their relationships...        │
│                                                                  │
│ Total Functions: 3    Total Nodes: 12    Total Edges: 20       │
│                                                                  │
│ Legend:                                                          │
│ 🔴 Function Nodes (Red)                                         │
│ 🟢 Control Flow (Green)                                         │
│ 🔵 Function Calls (Blue, Dashed)                                │
│ 🟠 Data Flow (Orange, Dashed)                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

### **3. Graph Visualization** (What nodes should look like)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│     ┌────────────────┐                                          │
│     │  main::1       │  ← RED BACKGROUND                        │
│     │  scanf(...)    │  ← WHITE TEXT                            │
│     └────────────────┘                                          │
│            │                                                     │
│            │ (green solid arrow)                                │
│            ↓                                                     │
│     ┌────────────────┐                                          │
│     │  main::2       │  ← RED BACKGROUND                        │
│     │  sum = add(... │  ← WHITE TEXT                            │
│     └────────────────┘                                          │
│            │                                                     │
│            │ (blue dashed arrow) ─────────┐                     │
│            │                               ↓                     │
│            │                        ┌────────────────┐          │
│            │                        │  add::1        │ ← RED    │
│            │                        │  return a + b  │          │
│            │                        └────────────────┘          │
│            │                                                     │
│            │ (orange dashed arrow for data flow)                │
│            ↓                                                     │
│     ┌────────────────┐                                          │
│     │  main::3       │  ← RED BACKGROUND                        │
│     │  printf(...)   │  ← WHITE TEXT                            │
│     └────────────────┘                                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### **4. Node Information Panel** (After clicking a node)
```
┌─────────────────────────────────────────────────────────────────┐
│ Node Information                                                 │
│ Function: main                                                   │
│ Block ID: 2                                                      │
│ Entry Block: No                                                  │
│ Exit Block: No                                                   │
│ Label: main::2                                                   │
│        int sum = add(num1, num2);                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ **Visual Checklist**

### **Node Appearance**
- [ ] **Background**: Red (`#ff6b6b`) - like a ripe tomato 🍅
- [ ] **Border**: Darker red (`#c92a2a`)
- [ ] **Text**: White - high contrast
- [ ] **Shape**: Rectangle/Box
- [ ] **Label Format**: `functionName::blockId\nstatement...`

### **Edge Appearance**

#### Green Edges (Control Flow)
- [ ] **Color**: Bright green (`#51cf66`) - like grass 🌿
- [ ] **Style**: Solid line ─────
- [ ] **Width**: Medium-thick (2px)
- [ ] **Arrow**: Points to successor
- [ ] **Connects**: Blocks within same function

#### Blue Edges (Function Calls)
- [ ] **Color**: Sky blue (`#4dabf7`) - like the sky ☁️
- [ ] **Style**: Dashed line ┈┈┈┈┈
- [ ] **Width**: Thickest (3px)
- [ ] **Arrow**: Points to callee entry
- [ ] **Connects**: Different functions

#### Orange Edges (Data Flow)
- [ ] **Color**: Orange (`#ffa94d`) - like an orange 🍊
- [ ] **Style**: Dashed line ┈┈┈┈┈ (shorter dashes)
- [ ] **Width**: Thinnest (1px)
- [ ] **Arrow**: Points from def to use
- [ ] **Connects**: Variable definitions to uses

---

## 🔍 **How to Identify Edge Types**

### **Visual Comparison**

```
Control Flow (Green, Solid):
    ──────────────────────────────►

Function Call (Blue, Dashed, Thick):
    ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈►

Data Flow (Orange, Dashed, Thin):
    ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈►
```

### **Hover Tooltips**

- **Control Flow**: "Control Flow"
- **Function Call**: "Call: main → add"
- **Data Flow**: "Data Flow: variableName"

---

## 🎯 **Expected Graph Structure for test_webview.cpp**

```
                    ┌──────────────┐
                    │   main::1    │ (RED)
                    │   scanf(...) │
                    └──────────────┘
                           │ (green)
                           ↓
                    ┌──────────────┐
                    │   main::2    │ (RED)
                    │   sum = ...  │
                    └──────────────┘
                      │           │
            (blue)    │           │ (orange: num1, num2)
                      ↓           ↓
            ┌──────────────┐  ┌──────────────┐
            │   add::1     │  │   main::3    │ (RED)
            │   return...  │  │   product... │
            └──────────────┘  └──────────────┘
                                     │
                           (blue)    │
                                     ↓
                              ┌──────────────┐
                              │ multiply::1  │ (RED)
                              │ result = ... │
                              └──────────────┘
                                     │ (green)
                                     ↓
                              ┌──────────────┐
                              │ multiply::2  │ (RED)
                              │ return...    │
                              └──────────────┘
```

---

## 🚨 **Red Flags (What NOT to See)**

### ❌ **WRONG: Nodes with different colors**
```
┌────────────────┐
│  main::1       │ ← BLUE background (WRONG!)
│  scanf(...)    │
└────────────────┘
```
**Expected**: ALL nodes should be RED

---

### ❌ **WRONG: All edges same color**
```
main::1 ──(green)──► main::2 ──(green)──► add::1
```
**Expected**: Function call should be BLUE dashed

---

### ❌ **WRONG: No edges visible**
```
┌────────────┐    ┌────────────┐    ┌────────────┐
│  main::1   │    │  main::2   │    │  add::1    │
└────────────┘    └────────────┘    └────────────┘
(no connections)
```
**Expected**: Multiple edges connecting nodes

---

### ❌ **WRONG: JavaScript error**
```
Debug Information
✓ HTML loaded
✓ vis-network loading from CDN...
❌ ERROR: Cannot read property 'nodes' of undefined
```
**Expected**: All checkmarks, no errors

---

## 📊 **Quick Validation Matrix**

| Element | Expected | ✅/❌ |
|---------|----------|-------|
| Node Color | Red | ___ |
| Node Text | White | ___ |
| Green Edges | Visible | ___ |
| Blue Edges | Visible, Dashed | ___ |
| Orange Edges | Visible, Dashed | ___ |
| Statistics | 3 funcs, 10+ nodes | ___ |
| Click Node | Shows info | ___ |
| Drag Node | Moves smoothly | ___ |
| Zoom | Works | ___ |
| Pan | Works | ___ |
| Console | No errors | ___ |

---

## 🎬 **Testing Workflow (30 seconds)**

1. **F5** → Launch extension
2. **Cmd+Shift+P** → "Analyze Active File"
3. **Cmd+Shift+P** → "Show CFG Visualization"
4. **Click** "Interconnected CFG" tab
5. **Look** for RED nodes ← MOST IMPORTANT
6. **Look** for 3 edge colors (green, blue, orange)
7. **Click** a node → Info panel updates
8. **Drag** a node → Moves
9. **Scroll** → Zooms
10. **Check** Debug panel → No errors

**Total time**: 30-60 seconds

---

## 📸 **Screenshot Checklist**

Take these screenshots for documentation:

1. ✅ **Full tab view** showing summary + graph
2. ✅ **Close-up of RED nodes** with clear labels
3. ✅ **Green edges** (control flow)
4. ✅ **Blue dashed edges** (function calls)
5. ✅ **Orange dashed edges** (data flow)
6. ✅ **Node info panel** after clicking
7. ✅ **Debug panel** showing success messages

---

## 🎯 **Pass/Fail Criteria**

### ✅ **PASS** if:
- All nodes are RED
- All 3 edge types visible
- Graph is interactive
- No errors in console

### ❌ **FAIL** if:
- Nodes are not red
- Missing edge types
- Graph doesn't render
- JavaScript errors

---

## 📝 **Quick Report Template**

```
Date: ___________
Tester: ___________

✅/❌ All nodes are RED
✅/❌ Green edges visible (control flow)
✅/❌ Blue edges visible (function calls)
✅/❌ Orange edges visible (data flow)
✅/❌ Statistics correct (3 funcs, 10+ nodes)
✅/❌ Node click works
✅/❌ Graph interactive (drag/zoom)
✅/❌ No console errors

Overall: PASS / FAIL

Notes:
[Any issues or observations]
```

---

**Ready to test!** Use this visual reference while validating. 🎨


# Quick Test: Interconnected CFG (30 seconds)

**Fast validation for the Interconnected CFG feature**

---

## ⚡ **30-Second Test**

### **1. Launch** (5 seconds)
```bash
Press F5 in VS Code
```

### **2. Analyze** (10 seconds)
```bash
Cmd+Shift+P → "Analyze Active File" → Enter
(Open test_webview.cpp first)
```

### **3. Visualize** (5 seconds)
```bash
Cmd+Shift+P → "Show CFG" → Enter
```

### **4. Switch Tab** (2 seconds)
```bash
Click "Interconnected CFG" tab
```

### **5. Validate** (8 seconds)
```bash
✅ Nodes are RED?
✅ Green edges visible?
✅ Blue dashed edges visible?
✅ Orange dashed edges visible?
✅ Can click nodes?
```

---

## ✅ **Expected Result**

You should see:
- **RED nodes** (like 🍅 tomatoes)
- **Green edges** (like 🌿 grass)
- **Blue dashed edges** (like ☁️ sky)
- **Orange dashed edges** (like 🍊 oranges)
- **3 functions**: main, add, multiply
- **10+ nodes** total
- **Interactive graph** (drag, zoom, click)

---

## ❌ **If Something's Wrong**

### Problem: Tab doesn't appear
→ Check analysis completed successfully

### Problem: Nodes not red
→ Check console for errors (F12)

### Problem: No edges
→ Check Debug panel at bottom

### Problem: Can't click
→ Wait for "vis-network loaded" message

---

## 📊 **Quick Stats Check**

Look at the top of the Interconnected CFG tab:

```
Total Functions: 3 ✅
Total Nodes: 10-15 ✅
Total Edges: 15-25 ✅
```

If numbers are wildly different → Something's wrong

---

## 🎯 **One-Line Validation**

**"Are all nodes RED with 3 colored edge types?"**

- **YES** → ✅ PASS
- **NO** → ❌ FAIL (report issue)

---

## 📝 **Report Back**

Just tell me:

1. **Nodes RED?** YES/NO
2. **3 edge colors?** YES/NO
3. **Interactive?** YES/NO
4. **Any errors?** YES/NO

That's it! 🚀

---

## 🔧 **If It Works**

Great! I'll proceed with:
- Task 7: Error handling
- Task 8: Full feature testing
- Task 9: Release notes
- Task 10: Documentation
- Task 11: Comments

---

## 🐛 **If It Doesn't Work**

Send me:
1. Screenshot of the tab
2. Console errors (F12 → Console)
3. Debug panel messages (bottom of visualizer)

I'll fix it immediately! 💪

---

**Test now and report back!** ⚡


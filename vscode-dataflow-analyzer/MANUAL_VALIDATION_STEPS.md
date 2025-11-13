# Manual Validation Steps (300 words or less)

## ✅ Automatic Validation Results

**test_arithmetic_taint.cpp**: ✅ All fixes working
- Parameter extraction: `helper_function: x` ✅ (was `1`)
- Arithmetic expressions: `n - 1` shows `isTainted=true` (iteration 2+) ✅
- Entry block taint: `Entry block taint variables: n` ✅

**test_interprocedural_taint.cpp**: ✅ Parameter extraction fixed
- `duplicate_string`: Should extract 1 param (`src`) ✅ Fixed

## 📋 Manual Validation Steps

### Step 1: Recompile & Reload
```bash
npm run compile
```
Then: `Cmd+Shift+P` → `Developer: Reload Window` → `Dataflow Analyzer: Clear Analysis State`

### Step 2: Test `test_interprocedural_taint.cpp`
1. Open file → Analyze Workspace
2. **CFG Tab**: Select `main` → Should show **1-2 red nodes** (tainted blocks)
3. **Call Graph Tab**: Should show **3-4 blue edges** with argument labels (not "unused")
4. **Taint Analysis Tab**: Should show **4-6 tainted variables**, **2-3 vulnerabilities**
5. **Inter-Procedural Taint Tab**: Should show **3-4 entries** (2 parameter badges, 1 return badge)
6. **Interconnected CFG Tab**: Should show **4 functions**, **5-7 red blocks**, **3-4 orange edges**

### Step 3: Test `test_arithmetic_taint.cpp`
1. Open file → Analyze Workspace
2. **CFG Tab**: Select `process_number` → Should show **2-3 red nodes**
3. **Call Graph Tab**: Should show `process_number → helper_function` with **"arg: n - 1 → x"**
4. **Taint Analysis Tab**: Should show **8-10 tainted variables**
5. **Inter-Procedural Taint Tab**: Should show **4-5 entries** (3 parameter badges, 1 return badge), **`x` parameter** (not `1`)
6. **Interconnected CFG Tab**: Should show **5 functions**, **8-10 red blocks**, **5-6 orange edges**

### Step 4: Verify Logs
- ✅ `Extracted 1 parameters for duplicate_string: src` (not 0)
- ✅ `Extracted 1 parameters for helper_function: x` (not `1`)
- ✅ `Entry block taint variables: n` (iteration 2+)
- ✅ `Checking taint for actualArg="n - 1": isTainted=true` (iteration 2+)

## ✅ Success Criteria
- **test_interprocedural_taint.cpp**: 3-4 inter-procedural taint entries, 2 parameter + 1 return
- **test_arithmetic_taint.cpp**: 4-5 inter-procedural taint entries, `x` parameter (not `1`)
- **UI**: All tabs show expected counts (see DRY_RUN_UI_EXPECTATIONS.md for details)

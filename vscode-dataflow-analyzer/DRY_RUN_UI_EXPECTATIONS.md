# Dry Run - Expected UI Output for Each Tab

## Test File: `test_interprocedural_taint.cpp`

### Tab 1: CFG
**Function Selector**: Shows 4 functions (`get_user_input`, `process_input`, `duplicate_string`, `main`)

**For `main` function**:
- **Nodes**: ~3-5 blocks (Entry, Exit, + intermediate blocks)
- **Red/Tainted Nodes**: 1-2 blocks (blocks containing `user_data` assignment and `strcpy` call)
- **Tainted Variables**: `user_data`, `buffer` (from `strcpy`)
- **Edges**: Green control flow edges between blocks

**For `get_user_input` function**:
- **Nodes**: ~3 blocks (Entry, Exit, + block with `fgets`)
- **Red/Tainted Nodes**: 1 block (block containing `fgets(buffer, ...)`)
- **Tainted Variables**: `buffer` (source: `user_input: fgets`)
- **Edges**: Green control flow edges

**For `process_input` function**:
- **Nodes**: ~3-4 blocks
- **Red/Tainted Nodes**: 1-2 blocks (blocks containing `input` parameter usage and `strcpy`)
- **Tainted Variables**: `input` (parameter), `local_buffer` (from `strcpy`)
- **Edges**: Green control flow edges

**For `duplicate_string` function**:
- **Nodes**: ~3-4 blocks
- **Red/Tainted Nodes**: 1-2 blocks (blocks containing `src` parameter and `strcpy`)
- **Tainted Variables**: `src` (parameter), `result` (from `strcpy`)
- **Edges**: Green control flow edges

---

### Tab 2: Call Graph
**Nodes**: 4 function nodes (`get_user_input`, `process_input`, `duplicate_string`, `main`)

**Edges**:
- `main` → `get_user_input` (blue, label: "returns: user_data")
- `main` → `process_input` (blue, label: "arg: user_data → input")
- `main` → `duplicate_string` (blue, label: "arg: user_data → src")
- `main` → `strcpy` (blue, library function call)

**Expected**: All edges show argument/return information (not "return value unused")

---

### Tab 3: Taint Analysis
**Summary Statistics**:
- **Total Tainted Variables**: 4-5 (`buffer`, `user_data`, `input`, `src`, `local_buffer`, `result`)
- **Vulnerabilities**: 2-3 (from `strcpy` calls with tainted data)
- **Source Categories**: `user_input` (from `fgets`)

**Tainted Variables List**:
1. `buffer` - Source: `user_input: fgets` (in `get_user_input`)
2. `user_data` - Source: `return_value:get_user_input->user_data` (in `main`)
3. `input` - Source: `parameter:input` (in `process_input`)
4. `src` - Source: `parameter:src` (in `duplicate_string`)
5. `local_buffer` - Source: `library_function:strcpy` (in `process_input`)
6. `result` - Source: `library_function:strcpy` (in `duplicate_string`)

**Vulnerabilities**:
- `strcpy(local_buffer, input)` - Buffer overflow risk
- `strcpy(result, src)` - Buffer overflow risk
- `strcpy(buffer, user_data)` - Buffer overflow risk

---

### Tab 4: Inter-Procedural Taint
**Summary Statistics**:
- **Cross-Function Taint Entries**: 3-4
- **Parameter Taint**: 2 (`input`, `src`)
- **Return Value Taint**: 1 (`user_data`)
- **Library Function Taint**: 2-3 (`strcpy` calls)

**Taint Flow by Source Function**:
1. **From `get_user_input`**:
   - `buffer` → `main.user_data` (return value)
   
2. **From `main`**:
   - `user_data` → `process_input.input` (parameter)
   - `user_data` → `duplicate_string.src` (parameter)
   - `user_data` → `main.buffer` (via `strcpy`)

**Detailed Entries**:
1. Entry 1: `user_data` - Source: `return_value:get_user_input->user_data` [RETURN badge]
2. Entry 2: `input` - Source: `parameter:input` [PARAMETER badge]
3. Entry 3: `src` - Source: `parameter:src` [PARAMETER badge]

---

### Tab 5: Interconnected CFG
**Total Functions**: 4
**Total Nodes**: ~12-15 blocks (all blocks from all functions)
**Total Edges**: 
- Green (Control Flow): ~8-10 edges
- Blue (Function Calls): 3-4 edges
- Orange (Data Flow): ~3-4 edges

**Tainted Blocks (Red)**: ~5-7 blocks
- `get_user_input`: 1 block (with `fgets`)
- `main`: 2 blocks (with `user_data` assignment and `strcpy`)
- `process_input`: 1-2 blocks (with `input` usage and `strcpy`)
- `duplicate_string`: 1-2 blocks (with `src` usage and `strcpy`)

**Normal Blocks (Blue)**: ~7-10 blocks (all other blocks)

---

## Test File: `test_arithmetic_taint.cpp`

### Tab 1: CFG
**Function Selector**: Shows 5 functions (`get_user_number`, `process_number`, `helper_function`, `fibonacci`, `main`)

**For `main` function**:
- **Nodes**: ~4-6 blocks
- **Red/Tainted Nodes**: 1-2 blocks (blocks containing `user_input` assignment and usage)
- **Tainted Variables**: `user_input`, `processed`, `fib`, `result`
- **Edges**: Green control flow edges

**For `get_user_number` function**:
- **Nodes**: ~3 blocks
- **Red/Tainted Nodes**: 1 block (block containing `scanf(&n)`)
- **Tainted Variables**: `n` (source: `user_input: scanf`)
- **Edges**: Green control flow edges

**For `process_number` function**:
- **Nodes**: ~4-5 blocks
- **Red/Tainted Nodes**: 2-3 blocks (blocks containing `n` parameter and arithmetic operations)
- **Tainted Variables**: `n` (parameter), `result1`, `result2`, `result3`, `result4`
- **Edges**: Green control flow edges

**For `helper_function` function**:
- **Nodes**: ~3 blocks
- **Red/Tainted Nodes**: 1 block (block containing `x` parameter usage)
- **Tainted Variables**: `x` (parameter)
- **Edges**: Green control flow edges

**For `fibonacci` function**:
- **Nodes**: ~4-5 blocks (includes recursive calls)
- **Red/Tainted Nodes**: 2-3 blocks (blocks containing `n` parameter and recursive calls)
- **Tainted Variables**: `n` (parameter)
- **Edges**: Green control flow edges (including back-edges for recursion)

---

### Tab 2: Call Graph
**Nodes**: 5 function nodes (`get_user_number`, `process_number`, `helper_function`, `fibonacci`, `main`)

**Edges**:
- `main` → `get_user_number` (blue, label: "returns: user_input")
- `main` → `process_number` (blue, label: "arg: user_input → n")
- `main` → `fibonacci` (blue, label: "arg: user_input → n")
- `process_number` → `helper_function` (blue, label: "arg: n - 1 → x")
- `fibonacci` → `fibonacci` (blue, recursive, label: "arg: n - 1 → n" and "arg: n - 2 → n")

**Expected**: All edges show argument/return information

---

### Tab 3: Taint Analysis
**Summary Statistics**:
- **Total Tainted Variables**: 8-10 (`n`, `user_input`, `processed`, `fib`, `result`, `result1-4`, `x`)
- **Vulnerabilities**: 0-1 (may have `printf` with tainted format if detected)
- **Source Categories**: `user_input` (from `scanf`)

**Tainted Variables List**:
1. `n` - Source: `user_input: scanf` (in `get_user_number`)
2. `user_input` - Source: `return_value:get_user_number->user_input` (in `main`)
3. `n` - Source: `parameter:n` (in `process_number`)
4. `result1`, `result2`, `result3` - Source: derived from `n` (in `process_number`)
5. `x` - Source: `parameter:x` (in `helper_function`)
6. `n` - Source: `parameter:n` (in `fibonacci`)

---

### Tab 4: Inter-Procedural Taint
**Summary Statistics**:
- **Cross-Function Taint Entries**: 4-5
- **Parameter Taint**: 3 (`n` in `process_number`, `n` in `fibonacci`, `x` in `helper_function`)
- **Return Value Taint**: 1 (`user_input`)
- **Library Function Taint**: 0

**Taint Flow by Source Function**:
1. **From `get_user_number`**:
   - `n` → `main.user_input` (return value)
   
2. **From `main`**:
   - `user_input` → `process_number.n` (parameter)
   - `user_input` → `fibonacci.n` (parameter)
   
3. **From `process_number`**:
   - `n` → `helper_function.x` (parameter via `n - 1`)
   
4. **From `fibonacci`**:
   - `n` → `fibonacci.n` (recursive parameter via `n - 1`, `n - 2`)

**Detailed Entries**:
1. Entry 1: `user_input` - Source: `return_value:get_user_number->user_input` [RETURN badge]
2. Entry 2: `n` - Source: `parameter:n` [PARAMETER badge] (in `process_number`)
3. Entry 3: `n` - Source: `parameter:n` [PARAMETER badge] (in `fibonacci`)
4. Entry 4: `x` - Source: `parameter:x` [PARAMETER badge] (in `helper_function`)

**Expected**: All entries show correct paths (e.g., `main:Entry → process_number:Entry`)

---

### Tab 5: Interconnected CFG
**Total Functions**: 5
**Total Nodes**: ~18-22 blocks (all blocks from all functions)
**Total Edges**: 
- Green (Control Flow): ~12-15 edges
- Blue (Function Calls): 5-6 edges
- Orange (Data Flow): ~5-6 edges

**Tainted Blocks (Red)**: ~8-10 blocks
- `get_user_number`: 1 block (with `scanf`)
- `main`: 2 blocks (with `user_input` assignment and usage)
- `process_number`: 2-3 blocks (with `n` parameter and arithmetic)
- `helper_function`: 1 block (with `x` parameter)
- `fibonacci`: 2-3 blocks (with `n` parameter and recursive calls)

**Normal Blocks (Blue)**: ~10-12 blocks (all other blocks)

---

## Updated Manual Validation Steps

### Step 1: Recompile & Reload
```bash
npm run compile
```
Then: `Cmd+Shift+P` → `Developer: Reload Window`

### Step 2: Clear State
`Cmd+Shift+P` → `Dataflow Analyzer: Clear Analysis State`

### Step 3: Test `test_interprocedural_taint.cpp`
1. Open file → Analyze Workspace
2. **CFG Tab**: Select `main` → Should show 1-2 red nodes (tainted blocks)
3. **Call Graph Tab**: Should show 3-4 blue edges with argument labels (not "unused")
4. **Taint Analysis Tab**: Should show 4-6 tainted variables, 2-3 vulnerabilities
5. **Inter-Procedural Taint Tab**: Should show 3-4 entries (2 parameter, 1 return)
6. **Interconnected CFG Tab**: Should show 4 functions, 5-7 red blocks, 3-4 orange edges

### Step 4: Test `test_arithmetic_taint.cpp`
1. Open file → Analyze Workspace
2. **CFG Tab**: Select `process_number` → Should show 2-3 red nodes
3. **Call Graph Tab**: Should show `process_number → helper_function` with "arg: n - 1 → x"
4. **Taint Analysis Tab**: Should show 8-10 tainted variables
5. **Inter-Procedural Taint Tab**: Should show 4-5 entries (3 parameter, 1 return), `x` parameter (not `1`)
6. **Interconnected CFG Tab**: Should show 5 functions, 8-10 red blocks, 5-6 orange edges

### Step 5: Verify Logs
- ✅ `Extracted 1 parameters for duplicate_string: src` (not 0)
- ✅ `Extracted 1 parameters for helper_function: x` (not `1`)
- ✅ `Entry block taint variables: n` (iteration 2+)
- ✅ `Checking taint for actualArg="n - 1": isTainted=true` (iteration 2+)

## ✅ Success Criteria
- **test_interprocedural_taint.cpp**: 3-4 inter-procedural taint entries, 2 parameter + 1 return
- **test_arithmetic_taint.cpp**: 4-5 inter-procedural taint entries, `x` parameter (not `1`), arithmetic expressions work
- **UI**: All tabs show expected counts and colors


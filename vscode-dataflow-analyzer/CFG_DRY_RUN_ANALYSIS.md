# Factorial CFG - Dry Run Analysis

## Source Code
```cpp
int factorial(int n) {
    if (n <= 1) {           // Line 26
        return 1;           // Line 27
    }
    int result = n * factorial(n - 1);  // Line 29
    return result;          // Line 30
}
```

## Correct CFG (Dry Run - What It SHOULD Be)

```
Entry Block
    |
    v
Block B1: Evaluate "n <= 1" (condition check)
    |
    +----> (TRUE: n <= 1)   -----> Block B2: "return 1;" -> Exit
    |
    +----> (FALSE: n > 1)   -----> Block B3: "int result = n * factorial(n - 1);"
                                       |
                                       v
                                    Block B4: "return result;" -> Exit
                                       ^
                                       |
    Block Exit
```

**Correct CFG Structure:**
```
Entry (Block 4)
  ↓
B3 (condition: n <= 1)
  ├─ TRUE → B1 (return 1;) → Exit (Block 0)
  └─ FALSE → B2 (result assignment) → Exit (Block 0)
```

**Correct Block Relationships:**
```
Entry:  successors: [B3], predecessors: []
B3:     successors: [B1, B2], predecessors: [Entry]
B1:     successors: [Exit], predecessors: [B3]
B2:     successors: [Exit], predecessors: [B3]
Exit:   successors: [], predecessors: [B1, B2]
```

---

## What Clang Generated (From Logs)

```
Block 4 (Entry): successors: [3], predecessors: []
Block 3 (B3):    successors: [2,1], predecessors: [4]
Block 1 (B1):    successors: [0], predecessors: [3]
Block 2 (B2):    successors: [0], predecessors: [3]
Block 0 (Exit):  successors: [], predecessors: [1,2]
```

**This IS CORRECT!** 

Mapping:
- Block 4 (Entry) = Entry
- Block 3 (B3) = condition check
- Block 1 (B1) = return 1 (TRUE branch)
- Block 2 (B2) = result assignment (FALSE branch)
- Block 0 (Exit) = Exit

---

## Verification ✅

| Item | Expected | Clang Generated | Match |
|------|----------|-----------------|-------|
| Entry successors | [B3] | [3] | ✅ |
| B3 successors | [B1, B2] | [2,1] | ✅ |
| B1 successors | [Exit] | [0] | ✅ |
| B2 successors | [Exit] | [0] | ✅ |
| Exit predecessors | [B1, B2] | [1,2] | ✅ |

---

## The Problem: Block Labeling!

The CFG **control flow IS correct**, but the **block labels are confusing**:

- Clang numbers blocks as: 0, 1, 2, 3, 4
- But labels are: "Exit", "B1", "B2", "B3", "Entry"
- The block numbers DON'T match the labels!

**This is why it looks wrong:**
- Block 0 is labeled "Exit" (confusing - 0 usually means entry)
- Block 4 is labeled "Entry" (confusing - 4 is higher number)
- Blocks are in numerical order but shown in reverse logical order

---

## What's Actually Happening

From logs lines 55-63 (order they were added):
1. Block 0: Exit (id=0, isExit=true) ← Added FIRST
2. Block 1: B1 (id=1) ← Added SECOND
3. Block 2: B2 (id=2) ← Added THIRD
4. Block 3: B3 (id=3) ← Added FOURTH
5. Block 4: Entry (id=4, isEntry=true) ← Added LAST

This is the **JSON order from cfg-exporter**, which lists blocks in the order Clang iterates them.

---

## Verification: Check the Statements

From logs lines 125-152, the statements in each block are:

**Block 1 (B1) - 4 statements:**
- "factorial(n - 1)"
- "int result = n * factorial(n - 1);"
- "result"
- "return result;"

**Block 2 (B2) - 2 statements:**
- "1"
- "return 1;"

**Block 3 (B3) - 1 statement:**
- "n <= 1" (the condition)

**Analysis:**
- B1 contains: variable declaration and return for FALSE branch ✓
- B2 contains: literal 1 and return for TRUE branch ✓
- B3 contains: condition check ✓

**This IS logically correct!** The block IDs and labels are just confusing, but the CFG structure is sound.

---

## Conclusion

✅ **The CFG IS theoretically sound and correct**

The appearance of being "wrong" comes from:
1. Block numbering (0-4) not matching semantic order
2. Block labels ("B1", "B2", etc.) not sequenced by ID
3. Entry is block 4, Exit is block 0 (counterintuitive)

The **actual control flow relationships are correct**. The `cfg-exporter` (using `clang::CFG::buildCFG()`) generated the correct structure.

To improve clarity, we could **reorder blocks by entry/exit semantics**, but the logic is already correct.


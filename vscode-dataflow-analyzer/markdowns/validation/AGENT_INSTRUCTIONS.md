# Agent Instructions - File Update Protocol

**Created**: 2025-01-XX  
**Last Updated**: 2025-01-XX (v1.9.5.1)  
**Purpose**: Instructions for AI agents working on this codebase

---

## 🔄 File Update Protocol

**CRITICAL RULE**: Whenever you complete a task or provide a reply, **you MUST update all related markdown files accordingly**.

## 🚫 Git Push Protocol

**CRITICAL RULE**: **NEVER push to git automatically**. Only commit changes locally unless explicitly requested by the user.
- User will request git pushes manually when ready
- Do NOT run `git push` commands unless explicitly asked
- You may commit changes locally (`git add` and `git commit`) but do NOT push
- Wait for explicit user request like "push to git" or "commit and push"

## 📋 Log Validation Protocol

**SPECIAL RULE**: When user pastes log output for a test file, automatically:
1. **Validate with validation MD files** - Compare actual vs expected results
2. **Note down other bugs/fixes** - Identify all issues from logs
3. **Fix all of them robustly** - Fix bugs in priority order
4. **Follow AGENT_INSTRUCTIONS** - Update all relevant markdown files

**See**: `LOG_VALIDATION_PROTOCOL.md` for complete workflow.

### What This Means

After completing any task:
1. **Identify all affected markdown files**
2. **Update them to reflect the changes**
3. **Ensure consistency across all documentation**
4. **Update version numbers, dates, and status fields**

---

## 📋 Files That May Need Updates

### Validation Files
- `markdowns/validation/TEMP_VALIDATION.md` - Update validation status, add new items
- `markdowns/validation/FINAL_VALIDATION_INSTRUCTIONS.md` - Update instructions if process changes
- `markdowns/validation/START_VALIDATION.md` - Update quick start if needed
- `markdowns/validation/VALIDATION_INSTRUCTIONS.md` - Update detailed instructions
- `markdowns/validation/VALIDATION_PROCESS.md` - Update process if workflow changes
- `markdowns/validation/LOGICAL_BUGS.md` - Update bug status, add new bugs

### Documentation Files
- `README.md` - Update if features change
- `CHANGELOG.md` - Add entries for significant changes
- `working_overview` - Update if architecture changes
- `working_overview.cpp` - Update if architecture changes
- `markdowns/active/*.md` - Update implementation status
- `markdowns/test_validation/*.md` - Update test validation results

### Configuration Files
- `package.json` - Update version if releasing

---

## 🔍 Examples of When to Update Files

### Example 1: Bug Fix Completed
**Action**: Fix BUG-001
**Files to Update**:
- `TEMP_VALIDATION.md` - Mark BUG-001 as FIXED
- `LOGICAL_BUGS.md` - Update bug status
- `CHANGELOG.md` - Add bug fix entry
- `working_overview` - Update if architecture changed

### Example 2: Feature Validation Completed
**Action**: Validate Phase 1.1 CFG Generation
**Files to Update**:
- `TEMP_VALIDATION.md` - Mark Phase 1.1 as VALIDATED
- `markdowns/test_validation/test_cfg_basic.md` - Update with actual results
- `VALIDATION_INSTRUCTIONS.md` - Update if process changed

### Example 3: New Feature Added
**Action**: Add new taint sensitivity level
**Files to Update**:
- `README.md` - Document new feature
- `CHANGELOG.md` - Add feature entry
- `working_overview` - Update feature list
- `working_overview.cpp` - Update if needed
- `TEMP_VALIDATION.md` - Add validation item
- `package.json` - Update version

### Example 4: Documentation Reorganized
**Action**: Merge validation files
**Files to Update**:
- `START_VALIDATION.md` - Update file references
- `VALIDATION_PROCESS.md` - Update if process changed
- `markdowns/INDEX.md` - Update file locations
- `markdowns/MIGRATION_NOTES.md` - Document reorganization

---

## ✅ Update Checklist

When completing a task, check:

- [ ] **Status Fields**: Updated validation status (PENDING → VALIDATED/FIXED)
- [ ] **Version Numbers**: Updated if releasing (package.json, CHANGELOG.md)
- [ ] **Dates**: Updated "Last Updated" fields
- [ ] **Cross-References**: Updated links between files
- [ ] **Consistency**: Same information appears consistently across files
- [ ] **Completeness**: All relevant files updated
- [ ] **Changelog**: Significant changes documented

---

## 📝 Update Patterns

### Pattern 1: Bug Status Update
```markdown
- [x] **BUG-001**: Unsafe Non-Null Assertions - FIXED (2025-01-XX)
```

### Pattern 2: Validation Status Update
```markdown
**Status**: VALIDATED (2025-01-XX)
**Result**: PASSED
**Notes**: All checks passed, no issues found
```

### Pattern 3: Version Update
```markdown
**Version**: 1.9.6
**Last Updated**: 2025-01-XX
```

### Pattern 4: Changelog Entry
```markdown
## [1.9.6] - 2025-01-XX
### Fixed
- Fixed BUG-001: Unsafe non-null assertions in CFGVisualizer.ts
```

---

## 🎯 Priority Order for Updates

1. **Critical Files** (Update First):
   - `TEMP_VALIDATION.md` - Validation status
   - `CHANGELOG.md` - Change history
   - `package.json` - Version (if releasing)

2. **Important Files** (Update Second):
   - `README.md` - User-facing documentation
   - `working_overview` - Architecture overview
   - `FINAL_VALIDATION_INSTRUCTIONS.md` - Instructions

3. **Reference Files** (Update Third):
   - `START_VALIDATION.md` - Quick start
   - `VALIDATION_INSTRUCTIONS.md` - Detailed instructions
   - `markdowns/INDEX.md` - File index

---

## ⚠️ Common Mistakes to Avoid

1. **Don't forget cross-references**: If you update a file path, update all references
2. **Don't skip status updates**: Always update validation/bug status
3. **Don't forget dates**: Update "Last Updated" fields
4. **Don't create inconsistencies**: Ensure same info across files
5. **Don't skip changelog**: Document significant changes

---

## 🔗 File Dependencies

Understanding which files reference others:

- `START_VALIDATION.md` → References `FINAL_VALIDATION_INSTRUCTIONS.md`, `TEMP_VALIDATION.md`
- `FINAL_VALIDATION_INSTRUCTIONS.md` → References `TEMP_VALIDATION.md`, test files
- `TEMP_VALIDATION.md` → References test files, validation files
- `working_overview` → Should match current codebase state
- `CHANGELOG.md` → Documents all changes chronologically

---

## 📚 Best Practices

1. **Update Immediately**: Don't wait, update files right after completing task
2. **Be Thorough**: Check all related files, not just obvious ones
3. **Be Consistent**: Use same format, terminology across files
4. **Document Changes**: Explain what changed and why
5. **Verify Updates**: Read updated files to ensure correctness

---

## 🎓 Example Workflow

### Task: Fix BUG-001

1. **Fix the bug** in code
2. **Update `TEMP_VALIDATION.md`**:
   - Mark BUG-001 as FIXED
   - Add fix date
3. **Update `LOGICAL_BUGS.md`**:
   - Update bug status
   - Add fix notes
4. **Update `CHANGELOG.md`**:
   - Add entry under Fixed section
5. **Update `working_overview`**:
   - If architecture changed, update accordingly
6. **Verify**:
   - Check all files are consistent
   - Check no broken references

---

## 📞 When in Doubt

If unsure which files to update:
1. **Search for related content**: Use grep to find references
2. **Check file dependencies**: See which files reference the changed content
3. **Update conservatively**: Better to update too many files than miss one
4. **Ask user**: If still unsure, ask for clarification

---

**Remember**: Documentation is as important as code. Keep it up-to-date!

---

**Last Updated**: 2025-01-XX  
**Status**: Active Instructions


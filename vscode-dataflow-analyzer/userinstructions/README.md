# User Instructions Directory

This directory contains all user instructions extracted, sorted, and consolidated from the chat history and other markdown files.

## Files

### 1. `raw.md` (545 lines)
**Purpose**: All raw instructions extracted from entire chat history  
**Content**: Every instruction given to the user, organized by source/topic  
**Use**: Reference for complete history of instructions

### 2. `sorted.md` (408 lines)
**Purpose**: Instructions sorted logically by category  
**Content**: Same instructions as raw.md, but organized into 12 logical categories  
**Use**: Easier to find instructions by category

### 3. `consolidated.md` (186 lines)
**Purpose**: Instructions that have been executed or are redundant  
**Content**: 
- Completed instructions (no need to repeat)
- Redundant instructions (superseded by better ones)
- Instructions to keep (still relevant)
- Pending instructions (user needs to execute)
**Use**: Reference for what's already done vs what needs doing

### 4. `final_instructions.md` (297 lines) ⭐ **START HERE - FOR USER ONLY**
**Purpose**: Complete guide for USER - How to use and validate the extension  
**Content**: 
- Quick start (using the extension)
- Debugging guide (extension issues)
- Complete validation process (all phases, test files, bug fixes)
- Log validation workflow (when user pastes logs)
- Common issues and solutions
- Quick reference (commands, files)
- Expected behavior
**Use**: **Primary reference FOR USER** - This is the file to use for all user instructions
**Note**: This file is FOR USER ONLY, not for AI agents

## How to Use

1. **Start with `final_instructions.md`** - This is the consolidated, deduplicated version
2. **Reference `consolidated.md`** - To see what's already been done
3. **Check `raw.md` or `sorted.md`** - If you need to find a specific instruction from history

## Consolidation Process

1. **Extracted** all USER instructions from chat history → `raw.md` (368 lines)
2. **Sorted** logically by category → `sorted.md` (366 lines)
3. **Identified** executed/redundant → `consolidated.md` (132 lines)
4. **Merged** similar instructions → `final_instructions.md` (297 lines)
5. **Merged** all instruction files (FINAL_VALIDATION_INSTRUCTIONS.md, COMMAND_DEBUGGING.md, etc.)
6. **Result**: Single succinct file (297 lines) with all USER instructions consolidated
7. **Focus**: USER instructions only (excluded AI agent protocols)

## Maintenance

When new instructions are added:
1. Add to `raw.md` first
2. Add to `sorted.md` in appropriate category
3. Update `consolidated.md` if instruction is executed/redundant
4. Merge into `final_instructions.md` if still relevant
5. Update this README if structure changes

## Related Files

**⚠️ NOTE**: The following files are now REDUNDANT - all content merged into `final_instructions.md`:
- ~~`markdowns/validation/AGENT_INSTRUCTIONS.md`~~ → Use "CRITICAL PROTOCOLS" section in final_instructions.md
- ~~`markdowns/validation/FINAL_VALIDATION_INSTRUCTIONS.md`~~ → Use "VALIDATION PROCESS" section in final_instructions.md
- ~~`markdowns/validation/LOG_VALIDATION_PROTOCOL.md`~~ → Use "LOG VALIDATION WORKFLOW" section in final_instructions.md
- ~~`COMMAND_DEBUGGING.md`~~ → Use "DEBUGGING" section in final_instructions.md
- ~~`DEBUGGING_INSTRUCTIONS.md`~~ → Use "DEBUGGING" section in final_instructions.md
- ~~`DEBUG_ACTIVATION.md`~~ → Use "DEBUGGING" section in final_instructions.md
- ~~`markdowns/validation/START_VALIDATION.md`~~ → Use "VALIDATION PROCESS" section in final_instructions.md

**Still Active** (reference files):
- `markdowns/validation/TEMP_VALIDATION.md` - Complete validation checklist
- `markdowns/validation/LOGICAL_BUGS.md` - Detailed bug report
- `markdowns/test_validation/*.md` - Expected results for each test


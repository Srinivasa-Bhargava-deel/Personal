# PLAN FOR LOGIC-2.1: Fix Race Condition in File Analysis

## 🎯 **TASK OBJECTIVE**
Fix race condition in `updateFile` method that can cause data corruption when multiple files are updated concurrently.

## 📋 **PROBLEM ANALYSIS**
- **Issue**: `updateFile` can be called concurrently from file watchers (save/change events)
- **Root Cause**: No synchronization mechanism - `this.currentState` is mutated without locking
- **Expected Behavior**: File updates should be serialized to prevent state corruption
- **Current State**: Concurrent updates can interleave, causing inconsistent analysis state

## 🏗️ **COMPREHENSIVE FRAMEWORK**

### **PHASE 1: ANALYSIS & DIAGNOSIS** 🔄 IN PROGRESS
**Objective**: Understand the concurrency pattern and identify all mutation points.

#### **Sub-task 1.1: Identify Concurrency Sources** ✅
- **Action**: Analyze where `updateFile` is called from
- **Findings**: 
  - Called from `onDidSaveTextDocument` (line 277)
  - Called from `onDidChangeTextDocument` (line 303)
  - Both can trigger concurrently for different files
- **Validation**: Identified two concurrent entry points

#### **Sub-task 1.2: Identify State Mutation Points** ✅
- **Action**: Find all places where `this.currentState` is mutated in `updateFile`
- **Findings**:
  - Line 739: `this.currentState!.cfg.functions.delete(funcName)` - Deletes functions
  - Line 744: `await this.analyzeFile(filePath, this.currentState.cfg)` - Reads CFG
  - Line 745: `this.currentState.fileStates.set(filePath, fileState)` - Updates file state
  - Lines 796-800: Updates liveness, RD, taint, vulnerabilities maps
  - Line 802: `this.stateManager.saveState(this.currentState)` - Saves state
- **Validation**: Multiple mutation points identified

---

### **PHASE 2: IMPLEMENT MUTEX MECHANISM** ⏳ PENDING
**Objective**: Add Promise-based mutex to serialize file updates.

#### **Sub-task 2.1: Create Mutex Class**
- **Action**: Implement a simple Promise-based mutex
- **Deliverable**: Mutex class that serializes async operations
- **Logging**: Log mutex acquire/release for debugging
- **Validation**: Mutex correctly serializes operations

#### **Sub-task 2.2: Integrate Mutex into DataflowAnalyzer**
- **Action**: Add mutex instance and wrap `updateFile` with mutex
- **Deliverable**: `updateFile` protected by mutex
- **Logging**: Log when operations wait for mutex
- **Validation**: Only one `updateFile` executes at a time

#### **Sub-task 2.3: Handle Mutex Errors**
- **Action**: Add error handling for mutex failures
- **Deliverable**: Graceful error handling with logging
- **Logging**: Log mutex errors
- **Validation**: Errors don't corrupt state

---

### **PHASE 3: VALIDATION & TESTING** ⏳ PENDING
**Objective**: Verify race condition is fixed.

#### **Sub-task 3.1: Test Concurrent File Updates**
- **Action**: Simulate concurrent file saves
- **Deliverable**: Test script or manual test
- **Logging**: Log mutex behavior during concurrent updates
- **Validation**: No data corruption, operations serialized

#### **Sub-task 3.2: Performance Testing**
- **Action**: Ensure mutex doesn't significantly impact performance
- **Deliverable**: Performance metrics
- **Logging**: Log timing information
- **Validation**: Acceptable performance impact

---

## 📊 **SUCCESS CRITERIA**
- [ ] Mutex prevents concurrent `updateFile` execution
- [ ] No data corruption during concurrent file updates
- [ ] Performance impact is minimal
- [ ] Logging confirms serialization

## 🔍 **LOGGING REQUIREMENTS**
- Log mutex acquire/release
- Log when operations wait for mutex
- Log mutex errors
- Log concurrent update attempts

## 📁 **FILES TO MODIFY**
- `src/analyzer/DataflowAnalyzer.ts` - Add mutex and wrap `updateFile`


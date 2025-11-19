# Changelog

All notable changes to the C++ Dataflow Analyzer extension will be documented in this file.

## [1.9.2.1] - 2025-01-XX

### Fixed
- **Windows Build Instructions**: Fixed "a subdirectory or a file build already exists" error when creating build directory
  - Updated instructions to properly handle existing build directories
  - Added `Remove-Item` command before creating build directory
  - Added troubleshooting section for this specific issue
  - Updated both PowerShell and Command Prompt methods

## [1.9.2] - 2025-01-XX

### Added
- **Comprehensive Logging for Counts**: Added detailed logging for function, node, edge, and legend counts in visualization output
  - `[SUMMARY]` logs with comprehensive visualization data summary
  - `[SENSITIVITY-CHECK]` logs with detailed taint counts and CFG structure
  - `[ALL_FUNCTIONS_LOG]` logs with edge type and node type breakdowns
- **Dry Run Analysis Document**: Created `DRY_RUN_ANALYSIS.md` with expected parameter values for each sensitivity level
- **Validation Framework**: Created `VALIDATION_SUMMARY.md` with testing instructions and validation checklist
- **Windows Build Instructions**: Created comprehensive `WINDOWS_BUILD_INSTRUCTIONS_v1.9.1.md` with complete Windows setup guide

### Fixed
- **Windows Path Handling**: Fixed `ClangASTParser.ts` to automatically detect Windows platform and handle `.exe` extension and `Release` subdirectory
- **Cross-Platform Binary Detection**: Improved cfg-exporter binary detection to work on both Windows and Unix systems

### Changed
- Enhanced logging in `DataflowAnalyzer.ts` to include comprehensive taint counts (pure data-flow, pure control-dependent, mixed)
- Enhanced logging in `CFGVisualizer.ts` to include detailed legend counts and edge type breakdowns
- Improved error messages for cfg-exporter binary not found with platform-specific build instructions

## [1.9.1] - 2025-01-XX

### Fixed
- **Tab Switching Sensitivity Mismatch**: Fixed issue where switching tabs after changing sensitivity would show stale visualization data. Now automatically detects mismatches and triggers re-analysis.
- **Visualization Data Regeneration**: Improved handling of visualization data when sensitivity changes. Data is now properly regenerated with correct sensitivity level.
- **Sensitivity Detection**: Added comprehensive logging and detection for sensitivity mismatches between state and visualization data.

### Added
- **Extensive Logging**: Added detailed logging throughout the sensitivity change workflow:
  - `[TAB-SWITCH]` logs for tab switching detection
  - `[SENSITIVITY-VERIFY]` logs for backend sensitivity verification
  - `[INIT]` logs for initialization sensitivity info
  - `[SENSITIVITY]` logs for dropdown changes
- **Sensitivity Storage**: Visualization data now stores sensitivity level for mismatch detection
- **Automatic Re-analysis**: Tab switching now automatically triggers re-analysis if sensitivity mismatch is detected

### Changed
- Improved error handling for sensitivity-related issues
- Enhanced visualization data preparation to include sensitivity metadata
- Better user feedback when sensitivity changes require re-analysis

## [1.9.0] - 2025-01-XX

### Added
- **5 Configurable Taint Sensitivity Levels**:
  - MINIMAL: Only explicit data-flow taint (fastest, cleanest visualization)
  - CONSERVATIVE: Basic control-dependent, no nested structures (fast, clean)
  - BALANCED: Full control-dependent + inter-procedural (balanced)
  - PRECISE: Path-sensitive + field-sensitive (precise, fewer false positives)
  - MAXIMUM: Context-sensitive + flow-sensitive (maximum precision, slower)
- **Recursive Control-Dependent Taint Propagation**: Tracks implicit data flow through control dependencies
- **Path-Sensitive Analysis**: Reduces false positives by only marking truly control-dependent blocks
- **Field-Sensitive Analysis**: Tracks taint at struct field level
- **Context-Sensitive Analysis**: k-limited context tracking for MAXIMUM level
- **Flow-Sensitive Analysis**: Statement order awareness for MAXIMUM level
- **Manual Save State Button**: Added button in visualization header to manually save analysis state
- **Re-analyze Button**: Added button to trigger re-analysis with current sensitivity settings
- **Save States List Tracking**: Tracks all saved states in `.vscode/save-states-list.json`

### Changed
- Enhanced taint analysis to support multiple sensitivity levels
- Improved visualization to show different taint types (data-flow, control-dependent, mixed)
- Updated configuration schema to include taint sensitivity setting

## [1.8.2] - Previous Version

See individual fix files for detailed changelog.



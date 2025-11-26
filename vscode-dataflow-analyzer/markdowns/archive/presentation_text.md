Real-Time Static Analysis & Security Visualization for C/C++



•Author:

•4 Nov 2025

Overview

•Real-time incremental static analysis for C/C++ in VS Code

•Detects security vulnerabilities and dataflow issues early

•Interactive Control Flow Graph visualization

•Cross-platform support with Clang/LLVM integration

•Educational tool for understanding secure coding practices



Progress: Core Analysis Features

•Liveness Analysis: Determines if variables are needed later, prevents uninitialized usage

•Reaching Definitions: Tracks where variable values originated through the program

•Taint Analysis: Tracks untrusted input flowing to sensitive operations

•Multiple source categories: user input, file I/O, network, environment, command line

•Detects vulnerabilities: SQL injection, command injection, format string, buffer overflow, path traversal



Progress: Visualization & Interactivity

•Interactive Control Flow Graph building in real-time

•Click blocks to see detailed analysis information

•Color-coded nodes for vulnerabilities and dataflow

•Unified view connecting all functions with control flow, call, and data flow edges

•Attack path visualization shows complete paths from sources to security sinks



Progress: Inter-Procedural Analysis

•Analysis across function boundaries

•Call graph construction showing function relationships

•Recursion detection: direct, mutual, and tail recursion

•Parameter mapping and return value tracking

•Global variable handling across functions



Progress: Security Features

•Automated detection of common vulnerabilities with CWE mapping

•Source-to-sink path visualization

•Interactive vulnerability dashboard

•Sanitization detection identifies safe operations

•Educational tool for understanding exploit mechanics



Progress: Performance & Integration

•Incremental analysis: only recomputes changed code regions

•Configurable update modes: keystroke or file save

•State persistence across sessions

•Official Clang/LLVM integration ensures accuracy

•First working VSIX built and deployed



Conclusion and Future Vision

•Comprehensive static analysis working inside VS Code editor

•Multiple analysis types successfully implemented: liveness, reaching definitions, taint, inter-procedural

•Security vulnerability detection with attack path visualization operational

•Future: multi-file analysis, secure coding views, CFG visualizations of historic code exploits

•Goal: powerful static analysis for everyone—inside their editor


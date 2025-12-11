# C++ Dataflow Analyzer & Security Vulnerability Detection

A comprehensive VSCode extension for real-time incremental static/dataflow analysis of C++ code with advanced security vulnerability detection and exploit post-mortem capabilities.

## Overview

This extension provides powerful static analysis capabilities for C++ codebases, focusing on:
- **Control Flow Graph (CFG) Visualization** - Interactive real-time CFG building using official Clang/LLVM libraries
- **Dataflow Analysis** - Liveness, reaching definitions, and taint analysis with full propagation tracking
- **Inter-Procedural Analysis (IPA)** - Analysis across function boundaries with call graphs, parameter mapping, and return value tracking
- **Security Vulnerability Detection** - Automated detection of common vulnerabilities with source-to-sink path tracking
- **Attack Path Visualization** - Complete path visualization from taint sources to security sinks
- **Interconnected CFG Visualization** - Unified view of all functions with control flow, call, and data flow edges

Perfect for security researchers, developers, and code reviewers who need to understand dataflow and identify security vulnerabilities in C++ code.

## Key Features

### Core Analysis Features

1. **Liveness Analysis**
   - Determines which variables are live at each program point
   - Backward dataflow analysis with iterative fixed-point algorithm
   - Visualized in CFG with live-in and live-out sets
   - Academic-correct implementation per Cooper & Torczon

2. **Reaching Definitions Analysis**
   - Tracks where variable definitions reach through the program
   - Forward dataflow analysis with full propagation history
   - Shows definition-to-use chains with complete path tracking
   - Identifies all definitions that can reach each use point
   - Displays propagation paths showing CFG traversal
   - Function parameters initialized as definitions at entry block

3. **Taint Analysis** (v1.3+)
   - Enhanced taint source detection (user input, file I/O, network, environment, command line, database, configuration)
   - Taint sink detection (SQL injection, command injection, format string, path traversal, buffer overflow, code injection, integer overflow)
   - Sanitization detection (input validation, encoding, escaping, whitelisting, type conversion, length limits)
   - Enhanced propagation with taint labels (USER_INPUT, FILE_CONTENT, NETWORK_DATA, CONTROL_DEPENDENT, etc.)
   - Vulnerability detection with source-to-sink path tracking
   - **Recursive Control-Dependent Taint Propagation** (v1.9.0): Tracks implicit data flow through control dependencies
   - **5 Configurable Sensitivity Levels** (v1.9.0): MINIMAL, CONSERVATIVE, BALANCED, PRECISE, MAXIMUM
   - **Path-Sensitive Analysis** (v1.9.0): Reduces false positives by only marking truly control-dependent blocks
   - **Field-Sensitive Analysis** (v1.9.0): Tracks taint at struct field level
   - **Context-Sensitive Analysis** (v1.9.0): k-limited context tracking for MAXIMUM level
   - **Flow-Sensitive Analysis** (v1.9.0): Statement order awareness for MAXIMUM level
   - **Automatic Sensitivity Mismatch Detection** (v1.9.1): Automatically detects and fixes visualization data mismatches when sensitivity changes
   - Inter-procedural taint propagation (v1.6+)

4. **Inter-Procedural Analysis (IPA)** (v1.2+)
   - **Call Graph Construction**: Builds complete call graphs showing function call relationships
   - **Recursion Detection**: Identifies direct, mutual, and tail recursion
   - **External Function Identification**: Categorizes library and system calls
   - **Context-Insensitive Analysis**: Tracks variable definitions across function boundaries
   - **Parameter Mapping**: Maps actual arguments to formal parameters with 7 derivation types (direct, expression, composite, address, call, dereference, array access)
   - **Return Value Analysis**: Tracks return values back to call sites with 6 return types (variable, expression, call, constant, conditional, void)
   - **Function Summaries**: Pre-defined models for common C library functions
   - **Global Variable Handling**: Analyzes global variable definitions and uses

5. **Security Vulnerability Detection**
   - Buffer overflow detection (CWE-120)
   - Use-after-free detection (CWE-416)
   - Double free detection (CWE-415)
   - Format string vulnerabilities (CWE-134)
   - Command injection (CWE-78)
   - SQL injection (CWE-89)
   - Path traversal (CWE-22)
   - Unsafe function calls
   - Uninitialized variable usage (CWE-457)
   - Taint-based vulnerability detection with source-to-sink paths

6. **Source-to-Sink Path Visualization**
   - Highlights complete attack paths from taint sources to security sinks
   - Color-coded paths based on vulnerability severity
   - Interactive path highlighting and navigation
   - Step-by-step path breakdown
   - Visual distinction between source, propagation, and sink blocks

### Visualization Features

- **Interactive CFG Graph**
  - Real-time updates as code changes
  - Click blocks to see detailed analysis information
  - Color-coded nodes (tainted blocks, attack paths)
  - Hierarchical layout with vis-network
  - Topologically sorted blocks for academic correctness

- **Interconnected CFG Visualization** (v1.5+)
  - Unified graph combining all function CFGs
  - Three edge types: Control Flow (green), Function Calls (blue), Data Flow (orange)
  - **Dynamic block sizing** (v1.9.0): Blocks resize based on content (statements, variables, labels)
  - **Edge type toggles** (v1.9.0): Show/hide specific edge types (Control Flow, Function Calls, Data Flow)
  - **Taint visualization** (v1.9.0+): 
    - Yellow (#ffd60a): Data-flow taint only (explicit flow)
    - Orange (#ffa94d): Control-dependent taint only (implicit flow)
    - Purple (#9d4edd): Mixed taint (both data-flow and control-dependent)
    - Magenta (#c77dff): Synthetic taint only (return statements without variables) (v1.9.1+)
    - Light Blue (#e8f4f8): Normal blocks (no taint)
  - Interactive visualization with click-to-inspect functionality
  - Physics-based layout for natural function grouping

- **Call Graph Visualization**
  - Interactive call graph with vis-network
  - Node styling for recursive/external functions
  - Call statistics and metrics display
  - DOT format export support

- **Taint Analysis Visualization**
  - Dedicated Taint Analysis tab
  - Taint summary with statistics
  - Tainted variables list with source information
  - Vulnerability list with interactive path highlighting
  - Source categories breakdown

- **Vulnerability Dashboard**
  - List all detected vulnerabilities
  - Display severity and CWE information
  - Click to highlight attack paths
  - CWE links displayed (when available)
  - Note: Filtering by severity/type planned for future releases

- **Analysis Summary**
  - Overview of all analyses
  - Statistics and metrics
  - Quick insights

### Technical Features

- **Official Clang/LLVM Integration**
  - Uses `clang::CFG::buildCFG()` for accurate CFG generation
  - `cfg-exporter` C++ tool for theoretically sound CFGs
  - Direct libclang/LLVM integration
  - Ensures academic correctness

- **Incremental Analysis**
  - Updates only changed files
  - Configurable update mode (keystroke or file save)
  - Debounced updates for performance

- **State Persistence** (v1.9.0+)
  - Saves analysis state per workspace
  - Stored in `.vscode/dataflow-state.json`
  - **Save states list** (v1.9.0): Tracks all saved states in `.vscode/save-states-list.json`
  - **Manual save button** (v1.9.0): Save state button in visualization header
  - Persists across sessions
  - **Incremental analysis** (v1.9.0): Uses SHA-256 file hashing for change detection
  - Only re-analyzes changed files, improving performance

## Requirements

### Complete Dependency List

This extension requires the following dependencies to be installed on your system:

#### Core Dependencies (All Platforms)

1. **Visual Studio Code**
   - **Version**: 1.80.0 or higher
   - **Download**: [code.visualstudio.com](https://code.visualstudio.com/)
   - **Purpose**: Extension host environment

2. **Node.js**
   - **Version**: 20.0.0 or higher (LTS recommended)
   - **Includes**: npm (Node Package Manager)
   - **Purpose**: TypeScript compilation, npm package management, extension runtime
   - **Download**: [nodejs.org](https://nodejs.org/)

3. **TypeScript**
   - **Version**: 5.0.0 or higher
   - **Installation**: Automatically installed via `npm install` (listed in `package.json`)
   - **Purpose**: Compiling TypeScript source code to JavaScript

4. **Git**
   - **Version**: Any recent version
   - **Purpose**: Cloning repository, version control
   - **Download**: [git-scm.com](https://git-scm.com/)

#### C++ Build Dependencies (Required for CFG Exporter)

5. **CMake**
   - **Version**: 3.13 or higher (CMakeLists.txt requires 3.13+)
   - **Purpose**: Build system for cfg-exporter C++ tool
   - **Download**: [cmake.org](https://cmake.org/)

6. **Clang/LLVM**
   - **Version**: 21.1.5 or higher
   - **Components Required**:
     - `clang` and `clang++` compilers
     - `libclang` (Clang C API library)
     - LLVM libraries (for `clang::CFG::buildCFG()`)
     - LLVM CMake configuration files
   - **Purpose**: CFG generation using official Clang/LLVM libraries
   - **Download**: Platform-specific (see installation instructions below)

7. **C++ Build Tools** (Platform-specific)
   - **macOS**: Xcode Command Line Tools (includes `make`, `g++`, etc.)
   - **Linux**: `build-essential` (Ubuntu/Debian), `gcc-c++` (RHEL/Fedora), `base-devel` (Arch)
   - **Windows**: Visual Studio Build Tools 2019/2022 (includes MSBuild, C++ compiler)

#### Additional Development Dependencies (Auto-installed via npm)

8. **npm Packages** (Installed via `npm install`)
   - `@types/node`: Node.js type definitions
   - `@types/vscode`: VS Code API type definitions
   - `@typescript-eslint/eslint-plugin`: TypeScript ESLint plugin
   - `@typescript-eslint/parser`: TypeScript ESLint parser
   - `eslint`: JavaScript/TypeScript linter
   - `jest`: Testing framework
   - `ts-jest`: TypeScript Jest transformer
   - `@types/jest`: Jest type definitions

#### Runtime Dependencies (Included in Extension)

9. **vis-network** (JavaScript Library)
   - **Version**: Latest (loaded from CDN)
   - **Purpose**: Interactive graph visualization
   - **Source**: CDN (jsdelivr.net/unpkg.com) - no local installation needed

### Platform-Specific Requirements Summary

| Dependency | macOS | Linux | Windows |
|------------|-------|-------|---------|
| VS Code | ✅ 1.80.0+ | ✅ 1.80.0+ | ✅ 1.80.0+ |
| Node.js | ✅ 20.0.0+ | ✅ 20.0.0+ | ✅ 20.0.0+ |
| npm | ✅ (bundled) | ✅ (bundled) | ✅ (bundled) |
| TypeScript | ✅ 5.0.0+ (via npm) | ✅ 5.0.0+ (via npm) | ✅ 5.0.0+ (via npm) |
| Git | ✅ Required | ✅ Required | ✅ Required |
| CMake | ✅ 3.13+ | ✅ 3.13+ | ✅ 3.13+ |
| Clang/LLVM | ✅ 21.1.5+ | ✅ 21.1.5+ | ✅ 21.1.5+ |
| C++ Compiler | ✅ (Xcode CLT) | ✅ (gcc/g++) | ✅ (MSVC via VS Build Tools) |
| Build Tools | ✅ (make, via Xcode CLT) | ✅ (make, via build-essential) | ✅ (MSBuild, via VS Build Tools) |
| Package Manager | Homebrew | apt/yum/pacman | N/A (installers) |

## Installation & Build Instructions

### Prerequisites Checklist

Before starting, ensure you have:
- **VS Code** 1.80.0 or higher installed
- **Node.js** 20.0.0 or higher (for extension development)
- **Clang/LLVM** 21.1.5 or higher (for CFG generation)
- **CMake** 3.16 or higher (for building cfg-exporter)
- **Git** (for cloning the repository)

### Quick Start (All Platforms)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd vscode-dataflow-analyzer
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Build the TypeScript extension**
   ```bash
   npm run compile
   ```

4. **Build the CFG exporter tool**
   ```bash
   cd cpp-tools/cfg-exporter
   mkdir -p build && cd build
   cmake ..
   cmake --build .
   ```

5. **Verify installation**
   ```bash
   # Check cfg-exporter binary exists
   ls -la build/cfg-exporter  # macOS/Linux
   dir build\cfg-exporter.exe  # Windows
   
   # Test cfg-exporter
   ./build/cfg-exporter --help  # macOS/Linux
   build\cfg-exporter.exe --help  # Windows
   ```

6. **Run the extension**
   - Open the project in VS Code: `code .`
   - Press `F5` to launch Extension Development Host
   - Open a C++ workspace or file
   - Run "Analyze Workspace" command from Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)

---

### Detailed Platform-Specific Instructions

#### macOS Setup

**Step 1: Install Homebrew** (if not already installed)

Homebrew is the recommended package manager for macOS. Install it if you don't have it:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Follow the on-screen instructions. After installation, you may need to add Homebrew to your PATH:

```bash
# For Apple Silicon (M1/M2/M3) Macs
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"

# For Intel Macs (usually already in PATH)
echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/usr/local/bin/brew shellenv)"
```

**Step 2: Install Xcode Command Line Tools** (Required for C++ compilation)

```bash
xcode-select --install
```

This installs:
- `gcc` and `g++` compilers
- `make` build tool
- Other essential development tools

**Step 3: Install Node.js and npm**

```bash
# Install Node.js (includes npm)
brew install node

# Verify installation
node --version    # Should be v20.0.0 or higher
npm --version     # Should be 9.0.0 or higher (comes with Node.js)
```

**Alternative**: If you need a specific Node.js version, you can use `nvm` (Node Version Manager):
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node.js 20 LTS
nvm install 20
nvm use 20
nvm alias default 20
```

**Step 4: Install CMake**

```bash
brew install cmake

# Verify installation
cmake --version   # Should be 3.13 or higher
```

**Step 5: Install LLVM/Clang**

```bash
# Install LLVM (includes clang, clang++, and all required libraries)
brew install llvm

# Verify installation
clang --version   # Should be 21.1.5 or higher
clang++ --version # Should match clang version
```

**Step 6: Configure LLVM Path** (Critical for CMake to find LLVM)

For **Apple Silicon (M1/M2/M3/M4)** Macs, add to `~/.zshrc` (or `~/.zprofile`):
```bash
export PATH="/opt/homebrew/opt/llvm/bin:$PATH"
export LDFLAGS="-L/opt/homebrew/opt/llvm/lib"
export CPPFLAGS="-I/opt/homebrew/opt/llvm/include"
export LLVM_DIR="/opt/homebrew/opt/llvm/lib/cmake/llvm"
```

For **Intel Macs**, add to `~/.zshrc` (or `~/.zprofile`):
```bash
export PATH="/usr/local/opt/llvm/bin:$PATH"
export LDFLAGS="-L/usr/local/opt/llvm/lib"
export CPPFLAGS="-I/usr/local/opt/llvm/include"
export LLVM_DIR="/usr/local/opt/llvm/lib/cmake/llvm"
```

Then reload your shell:
```bash
source ~/.zshrc
# OR
source ~/.zprofile
```

**Step 7: Install Git** (if not already installed)

```bash
brew install git

# Verify installation
git --version
```

**Step 8: Clone Repository and Install Extension Dependencies**

```bash
# Clone the repository (replace with your repository URL)
git clone <repository-url>
cd vscode-dataflow-analyzer

# Install all npm dependencies (includes TypeScript, ESLint, Jest, etc.)
npm install

# Verify TypeScript was installed
npx tsc --version  # Should be 5.0.0 or higher
```

**Step 9: Build CFG Exporter (C++ Tool)**

```bash
cd cpp-tools/cfg-exporter
mkdir -p build && cd build

# Configure CMake with LLVM path
# For Apple Silicon Macs:
cmake .. -DLLVM_DIR=/opt/homebrew/opt/llvm/lib/cmake/llvm

# For Intel Macs:
cmake .. -DLLVM_DIR=/usr/local/opt/llvm/lib/cmake/llvm

# Build the cfg-exporter binary
cmake --build .

# Verify binary was created
ls -la cfg-exporter
file cfg-exporter  # Should show "Mach-O 64-bit executable"

# Test the binary
./cfg-exporter --help
```

**Step 10: Compile TypeScript Extension**

```bash
# Return to project root
cd /path/to/vscode-dataflow-analyzer

# Compile TypeScript to JavaScript
npm run compile

# Verify compilation succeeded
ls -la out/extension.js  # Should exist
```

**Step 11: Run Extension**

```bash
# Open project in VS Code
code .

# In VS Code:
# 1. Press F5 to launch Extension Development Host
# 2. Or use Command Palette (Cmd+Shift+P): "Debug: Start Debugging"
# 3. A new VS Code window will open (Extension Development Host)
# 4. Open a C++ file or workspace
# 5. Run "Analyze Workspace" command from Command Palette
```

**Troubleshooting macOS:**

- **"cmake: command not found"**
  - Solution: Ensure CMake is installed: `brew install cmake`
  - Verify PATH: `which cmake`

- **"CMake can't find LLVM"**
  - Solution: Specify LLVM path explicitly: `cmake .. -DLLVM_DIR=/opt/homebrew/opt/llvm/lib/cmake/llvm` (Apple Silicon) or `/usr/local/opt/llvm/lib/cmake/llvm` (Intel)
  - Verify LLVM installation: `brew list llvm`

- **"clang: command not found"**
  - Solution: Ensure LLVM is in PATH: `export PATH="/opt/homebrew/opt/llvm/bin:$PATH"` (add to `~/.zshrc`)
  - Reload shell: `source ~/.zshrc`

- **"Node.js version too old"**
  - Solution: Install Node.js 20+: `brew install node` or use `nvm install 20`
  - Verify: `node --version`

- **"TypeScript compilation errors"**
  - Solution: Run `npm install` to ensure all dependencies are installed
  - Check `package.json` has correct TypeScript version (5.0.0+)

- **"cfg-exporter build fails"**
  - Solution: Ensure Xcode Command Line Tools are installed: `xcode-select --install`
  - Check LLVM CMake files exist: `ls /opt/homebrew/opt/llvm/lib/cmake/llvm/` (Apple Silicon)

- **"M1/M2 Mac compatibility issues"**
  - Solution: Ensure you're using ARM64 versions of all tools
  - Check Node.js architecture: `node -p "process.arch"` (should be `arm64`)
  - Use Homebrew's native ARM64 installation: `/opt/homebrew` (not `/usr/local`)

---

#### Linux Setup

**Step 1: Install Node.js and npm**

**Ubuntu/Debian (using NodeSource repository for Node.js 20+):**
```bash
# Update package list
sudo apt-get update

# Install prerequisites
sudo apt-get install -y curl gnupg ca-certificates

# Add NodeSource repository for Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js (includes npm)
sudo apt-get install -y nodejs

# Verify installation
node --version    # Should be v20.0.0 or higher
npm --version     # Should be 9.0.0 or higher
```

**Alternative for Ubuntu/Debian (using default repositories - may have older version):**
```bash
sudo apt-get update
sudo apt-get install -y nodejs npm
# Note: May need to upgrade if version < 20.0.0
```

**RedHat/CentOS/Fedora:**
```bash
# For Fedora
sudo dnf install -y nodejs npm

# For CentOS/RHEL (may need EPEL repository)
sudo yum install -y epel-release
sudo yum install -y nodejs npm

# Verify installation
node --version
npm --version

# If Node.js version is too old (< 20.0.0), use NodeSource:
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
```

**Arch Linux:**
```bash
sudo pacman -S nodejs npm

# Verify installation
node --version
npm --version
```

**Step 2: Install CMake**

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y cmake

# Verify installation
cmake --version   # Should be 3.13 or higher
```

**RedHat/CentOS/Fedora:**
```bash
# Fedora
sudo dnf install -y cmake

# CentOS/RHEL
sudo yum install -y cmake

# Verify installation
cmake --version
```

**Arch Linux:**
```bash
sudo pacman -S cmake

# Verify installation
cmake --version
```

**Step 3: Install LLVM/Clang**

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y \
    clang \
    clang++ \
    llvm \
    llvm-dev \
    libclang-dev \
    libclang-common-dev

# Verify installation
clang --version   # Should be 21.1.5 or higher
clang++ --version # Should match clang version
llvm-config --version
```

**RedHat/CentOS/Fedora:**
```bash
# Fedora
sudo dnf install -y \
    clang \
    clang-tools-extra \
    llvm \
    llvm-devel \
    llvm-static

# CentOS/RHEL
sudo yum install -y \
    clang \
    clang-tools-extra \
    llvm \
    llvm-devel \
    llvm-static

# Verify installation
clang --version
clang++ --version
llvm-config --version
```

**Arch Linux:**
```bash
sudo pacman -S clang llvm

# Verify installation
clang --version
clang++ --version
llvm-config --version
```

**Step 4: Install C++ Build Tools**

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y \
    build-essential \
    gcc \
    g++ \
    make \
    pkg-config

# Verify installation
gcc --version
g++ --version
make --version
```

**RedHat/CentOS/Fedora:**
```bash
# Fedora
sudo dnf install -y \
    gcc \
    gcc-c++ \
    make \
    pkgconfig

# CentOS/RHEL
sudo yum install -y \
    gcc \
    gcc-c++ \
    make \
    pkgconfig

# Verify installation
gcc --version
g++ --version
make --version
```

**Arch Linux:**
```bash
sudo pacman -S base-devel

# base-devel includes: gcc, g++, make, pkg-config, and other build tools
# Verify installation
gcc --version
g++ --version
make --version
```

**Step 5: Install Git**

**Ubuntu/Debian:**
```bash
sudo apt-get install -y git

# Verify installation
git --version
```

**RedHat/CentOS/Fedora:**
```bash
# Fedora
sudo dnf install -y git

# CentOS/RHEL
sudo yum install -y git

# Verify installation
git --version
```

**Arch Linux:**
```bash
sudo pacman -S git

# Verify installation
git --version
```

**Step 6: Clone Repository and Install Extension Dependencies**

```bash
# Clone the repository (replace with your repository URL)
git clone <repository-url>
cd vscode-dataflow-analyzer

# Install all npm dependencies (includes TypeScript, ESLint, Jest, etc.)
npm install

# Verify TypeScript was installed
npx tsc --version  # Should be 5.0.0 or higher
```

**Step 7: Build CFG Exporter (C++ Tool)**

```bash
cd cpp-tools/cfg-exporter
mkdir -p build && cd build

# Configure CMake
cmake ..

# If CMake can't find LLVM, specify the path explicitly:
# cmake .. -DLLVM_DIR=/usr/lib/llvm-21/lib/cmake/llvm
# (Path may vary by distribution - check with: find /usr -name "LLVMConfig.cmake" 2>/dev/null)

# Build the cfg-exporter binary
cmake --build .

# Verify binary was created
ls -la cfg-exporter
file cfg-exporter  # Should show "ELF 64-bit LSB executable"

# Test the binary
./cfg-exporter --help
```

**Step 8: Compile TypeScript Extension**

```bash
# Return to project root
cd /path/to/vscode-dataflow-analyzer

# Compile TypeScript to JavaScript
npm run compile

# Verify compilation succeeded
ls -la out/extension.js  # Should exist
```

**Step 9: Run Extension**

```bash
# Open project in VS Code
code .

# In VS Code:
# 1. Press F5 to launch Extension Development Host
# 2. Or use Command Palette (Ctrl+Shift+P): "Debug: Start Debugging"
# 3. A new VS Code window will open (Extension Development Host)
# 4. Open a C++ file or workspace
# 5. Run "Analyze Workspace" command from Command Palette
```

**Troubleshooting Linux:**

- **"Node.js version too old"**
  - Solution: Use NodeSource repository for Node.js 20+:
    ```bash
    # Ubuntu/Debian
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    # RHEL/CentOS/Fedora
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
    sudo yum install -y nodejs
    ```
  - Verify: `node --version`

- **"CMake can't find LLVM"**
  - Solution: Install `llvm-dev` package (Ubuntu/Debian) or `llvm-devel` (RHEL/Fedora)
  - Find LLVM CMake config: `find /usr -name "LLVMConfig.cmake" 2>/dev/null`
  - Specify LLVM path: `cmake .. -DLLVM_DIR=/usr/lib/llvm-21/lib/cmake/llvm` (path may vary)

- **"clang++: command not found"**
  - Solution: Install `clang++` package: `sudo apt-get install clang++` (Ubuntu/Debian)
  - Verify: `which clang++`

- **"Build fails with missing headers"**
  - Solution: Install development packages: `sudo apt-get install libclang-dev` (Ubuntu/Debian)
  - For RHEL/Fedora: `sudo yum install llvm-devel`

- **"Permission denied" when running cfg-exporter**
  - Solution: Ensure binary is executable: `chmod +x cpp-tools/cfg-exporter/build/cfg-exporter`

- **"Package manager errors"**
  - Ubuntu/Debian: Update package list: `sudo apt-get update`
  - RHEL/CentOS: Enable EPEL: `sudo yum install epel-release`
  - Arch: Update package database: `sudo pacman -Sy`

---

#### Windows Setup

> **📘 Complete Windows Guide**: For detailed step-by-step Windows installation instructions, see [WINDOWS_BUILD_INSTRUCTIONS.md](WINDOWS_BUILD_INSTRUCTIONS.md)

**Step 1: Install Node.js**
1. Download Node.js LTS (20.x or higher) from [nodejs.org](https://nodejs.org/)
2. Run the installer (`node-v20.x.x-x64.msi`)
3. Select "Add to PATH" during installation
4. Verify installation:
   ```powershell
   node --version
   npm --version
   ```

**Step 2: Install CMake**
1. Download CMake from [cmake.org/download](https://cmake.org/download/)
2. Choose "Windows x64 Installer" (`.msi` file)
3. Run the installer
4. **Important**: Check "Add CMake to the system PATH for all users" during installation
5. Verify installation:
   ```powershell
   cmake --version
   ```

**Step 3: Install LLVM/Clang**
1. Download LLVM from [llvm.org](https://github.com/llvm/llvm-project/releases)
2. Choose "LLVM-21.1.5-win64.exe" (or latest version)
3. Run the installer
4. **Important**: Check "Add LLVM to the system PATH" during installation
5. Verify installation:
   ```powershell
   clang --version
   ```

**Step 4: Install Visual Studio Build Tools**
1. Download Visual Studio Build Tools from [visualstudio.microsoft.com/downloads](https://visualstudio.microsoft.com/downloads/)
2. Run the installer
3. Select "Desktop development with C++" workload
4. Also select "CMake tools for Windows" (optional but recommended)
5. Click "Install"

**Step 5: Build CFG Exporter**

Open **PowerShell** or **Command Prompt** (as Administrator recommended):

```powershell
# Navigate to project directory
cd cpp-tools\cfg-exporter

# Create build directory
mkdir build -Force
cd build

# Configure with CMake
cmake ..

# Build (Release configuration)
cmake --build . --config Release

# Verify binary was created
dir cfg-exporter.exe
```

**Alternative: Using Visual Studio Developer Command Prompt**
```cmd
# Open "x64 Native Tools Command Prompt for VS 2022" from Start Menu
cd cpp-tools\cfg-exporter
mkdir build
cd build
cmake .. -G "Visual Studio 17 2022" -A x64
cmake --build . --config Release
```

**Step 6: Install Extension Dependencies**
```powershell
cd C:\path\to\vscode-dataflow-analyzer
npm install
```

**Step 7: Compile TypeScript**
```powershell
npm run compile
```

**Step 8: Run Extension**
1. Open VS Code: `code .`
2. Press `F5` to launch Extension Development Host
3. Or use Command Palette (`Ctrl+Shift+P`): "Debug: Start Debugging"

**Troubleshooting Windows:**
- If `cmake` command not found, restart your terminal/PowerShell after installing CMake
- If `clang` command not found, restart your terminal/PowerShell after installing LLVM
- If build fails with "MSBuild not found", ensure Visual Studio Build Tools are installed
- For CMake errors, try: `cmake .. -G "Visual Studio 17 2022" -A x64`
- Ensure you're using PowerShell or Command Prompt (not Git Bash) for Windows-specific commands

---

### Verification Steps

After installation, verify everything works:

**1. Verify cfg-exporter binary:**
```bash
# macOS/Linux
./cpp-tools/cfg-exporter/build/cfg-exporter --help

# Windows
cpp-tools\cfg-exporter\build\cfg-exporter.exe --help
```

**2. Test with a sample C++ file:**
```bash
# Create a test file
echo 'int main() { return 0; }' > test.cpp

# macOS/Linux
./cpp-tools/cfg-exporter/build/cfg-exporter test.cpp -- -std=c++17

# Windows
cpp-tools\cfg-exporter\build\cfg-exporter.exe test.cpp -- -std=c++17
```

**3. Verify TypeScript compilation:**
```bash
npm run compile
# Should complete without errors
ls out/extension.js  # macOS/Linux
dir out\extension.js  # Windows
```

**4. Test Extension in VS Code:**
- Press `F5` to launch Extension Development Host
- Open a C++ file
- Run "Analyze Workspace" command
- Check that CFG visualization appears

---

### Common Issues & Solutions

**Issue: "cfg-exporter binary not found"**
- **Solution**: Ensure you've built the cfg-exporter tool (Step 4 in platform-specific instructions)
- **Verify**: Check that `cpp-tools/cfg-exporter/build/cfg-exporter` (or `.exe` on Windows) exists

**Issue: "CMake can't find LLVM"**
- **macOS**: Specify LLVM path: `cmake .. -DLLVM_DIR=/opt/homebrew/opt/llvm/lib/cmake/llvm`
- **Linux**: Install `llvm-dev` package: `sudo apt-get install llvm-dev`
- **Windows**: Ensure LLVM is added to PATH and restart terminal

**Issue: "Node.js version too old"**
- **Solution**: Install Node.js 20.x or higher from [nodejs.org](https://nodejs.org/)
- **Verify**: `node --version` should show v20.0.0 or higher

**Issue: "TypeScript compilation errors"**
- **Solution**: Run `npm install` to ensure all dependencies are installed
- **Verify**: Check `package.json` has correct TypeScript version (5.0.0+)

**Issue: "Extension doesn't activate"**
- **Solution**: Check VS Code version (must be 1.80.0+)
- **Verify**: Check Developer Console (`Help > Toggle Developer Tools`) for errors

---

### Development Workflow

**Watch Mode (Auto-compile on changes):**
```bash
npm run watch
```

**Manual Compilation:**
```bash
npm run compile
```

**Linting:**
```bash
npm run lint
```

**Running Tests:**
```bash
npm test
```

## Usage

### Basic Workflow

1. **Open a C++ Workspace**
   - Open a folder containing C++ files (.cpp, .cxx, .cc, .c, .hpp, .h)

2. **Run Analysis**
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS)
   - Type "Analyze Workspace" and select it
   - Wait for analysis to complete

3. **View CFG Visualization**
   - Press `Ctrl+Shift+P`
   - Type "Show Control Flow Graph" and select it
   - The CFG visualizer will open in a new panel

4. **Explore Features**
   - **CFG Tab**: View individual function control flow graphs
   - **Call Graph Tab**: See function call relationships
   - **Parameters & Returns Tab**: View parameter mapping and return value analysis
   - **Inter-Procedural Tab**: See inter-procedural dataflow analysis
   - **Taint Analysis Tab**: View taint sources, sinks, and vulnerabilities
   - **Interconnected CFG Tab**: Unified view of all functions with all edge types

5. **Explore Vulnerabilities**
   - Click on the "Taint Analysis" tab in the visualizer
   - Click any vulnerability to highlight its attack path
   - View detailed information including CWE links and recommendations

### Configuration

Open VSCode settings (`Ctrl+,` or `Cmd+,`) and search for "Dataflow Analyzer":

- **Update Mode**: Choose when to trigger analysis
  - `keystroke`: Update on every keystroke (with debounce)
  - `save`: Update only when files are saved (default)

- **Debounce Delay**: Delay in milliseconds for keystroke mode (default: 500ms)

- **Enable Liveness**: Toggle liveness analysis (default: true)

- **Enable Reaching Definitions**: Toggle reaching definitions analysis (default: true)

- **Enable Taint Analysis**: Toggle taint analysis (default: true)

- **Enable Inter-Procedural**: Toggle inter-procedural analysis (default: true)

- **Taint Sensitivity** (v1.9.0+): Choose taint analysis sensitivity level
  - `minimal`: Only explicit data-flow (fastest)
  - `conservative`: Basic control-dependent (fast)
  - `balanced`: Full recursive control-dependent + inter-procedural (default)
  - `precise`: Path-sensitive + field-sensitive (reduces false positives)
  - `maximum`: Context-sensitive + flow-sensitive (most precise, slower)

### Commands

- `dataflowAnalyzer.showCFG` - Show Control Flow Graph visualizer
- `dataflowAnalyzer.analyzeWorkspace` - Analyze entire workspace (excludes libraries/headers by default)
- `dataflowAnalyzer.analyzeActiveFile` - Analyze only the active C/C++ source file
- `dataflowAnalyzer.clearState` - Clear saved analysis state
- `dataflowAnalyzer.deleteStateAndReAnalyze` - Delete saved state and perform fresh analysis (v1.9.1+)
- `dataflowAnalyzer.saveState` - Manually save current analysis state (v1.9.0+)
- `dataflowAnalyzer.reAnalyze` - Manually trigger re-analysis (v1.9.0+)
- `dataflowAnalyzer.changeSensitivityAndAnalyze` - Change taint sensitivity and re-analyze (v1.9.0+)

## Architecture

### Project Structure

```
vscode-dataflow-analyzer/
├── src/
│   ├── analyzer/
│   │   ├── CPPParser.ts                      # Primitive parser (fallback)
│   │   ├── EnhancedCPPParser.ts              # Main parser using CFG exporter
│   │   ├── ClangASTParser.ts                 # CFG exporter wrapper (uses libclang)
│   │   ├── DataflowAnalyzer.ts               # Main orchestrator
│   │   ├── LivenessAnalyzer.ts               # Liveness analysis (backward DFA)
│   │   ├── ReachingDefinitionsAnalyzer.ts    # Reaching definitions (forward DFA)
│   │   ├── TaintAnalyzer.ts                  # Taint analysis (forward propagation)
│   │   ├── TaintSourceRegistry.ts            # Taint source registry
│   │   ├── TaintSinkRegistry.ts              # Taint sink registry
│   │   ├── SanitizationRegistry.ts           # Sanitization function registry
│   │   ├── SecurityAnalyzer.ts               # Vulnerability detection & attack path
│   │   ├── CallGraphAnalyzer.ts              # Call graph construction (Phase 1)
│   │   ├── CallGraphAnalyzer.Extensions.ts   # Advanced call graph analysis (Phase 2)
│   │   ├── InterProceduralReachingDefinitions.ts  # Inter-procedural dataflow (Phase 3)
│   │   ├── ParameterAnalyzer.ts              # Parameter mapping (Phase 4)
│   │   ├── ReturnValueAnalyzer.ts            # Return value analysis (Phase 4)
│   │   ├── FunctionSummaries.ts              # Library function summaries (Phase 4)
│   │   ├── FunctionCallExtractor.ts          # Robust function call extraction
│   │   └── __tests__/                        # Unit tests
│   ├── visualizer/
│   │   └── CFGVisualizer.ts                  # CFG webview visualizer (vis-network)
│   ├── state/
│   │   └── StateManager.ts                   # State persistence (.vscode/dataflow-state.json)
│   ├── types.ts                              # Type definitions (CFG, Analysis, etc.)
│   └── extension.ts                          # Extension entry point
├── cpp-tools/
│   └── cfg-exporter/                         # C++ CFG exporter tool
│       ├── cfg-exporter.cpp                  # Main CFG exporter using libclang
│       ├── CMakeLists.txt                    # CMake build configuration
│       ├── build/
│       │   └── cfg-exporter                  # Compiled binary (after build)
│       └── README.md                         # CFG exporter documentation
├── out/                                      # Compiled JavaScript (generated)
├── package.json                              # Extension manifest
├── tsconfig.json                             # TypeScript configuration
└── README.md                                 # This file
```

### Key Components

0. **CFG Exporter (C++ Tool)**
   - Location: `cpp-tools/cfg-exporter/cfg-exporter.cpp`
   - Uses official `clang::CFG::buildCFG()` from libclang
   - Uses `clang::RecursiveASTVisitor` for AST traversal
   - Generates CFG as JSON with blocks, statements, successors/predecessors
   - Compiled with CMake using official LLVM/Clang libraries
   - Ensures theoretically sound, academically correct CFGs

1. **Parser Layer**
   - `ClangASTParser.ts`: Wraps `cfg-exporter` binary (uses official libclang)
   - Parses JSON output from `cfg-exporter`
   - Converts CFG data to internal ASTNode format
   - `EnhancedCPPParser.ts`: Main parser that uses CFG exporter output
   - Extracts functions, basic blocks, statements, and control flow
   - Entry/exit block detection using graph-theoretic properties (no predecessors/successors)

2. **Analysis Layer**
   - **LivenessAnalyzer.ts**: Backward dataflow analysis
     - Equation: `IN[B] = USE[B] ∪ (OUT[B] - DEF[B])`
     - Equation: `OUT[B] = ∪ IN[S] for all successors S`
     - Fixed-point iteration until convergence
     - Based on Dragon Book & Cooper & Torczon algorithms
   
   - **ReachingDefinitionsAnalyzer.ts**: Forward dataflow analysis
     - Equation: `IN[B] = ∪ OUT[P] for all predecessors P`
     - Equation: `OUT[B] = GEN[B] ∪ (IN[B] - KILL[B])`
     - Tracks definition propagation through CFG
     - Maintains complete path history for each definition
     - Function parameters initialized as definitions at entry block
     - MAX_ITERATIONS safety check to prevent infinite loops
     - Cycle detection in propagation paths
     - Academic-correct implementation
   
   - **TaintAnalyzer.ts**: Forward propagation of taint information
     - Enhanced source detection (7 categories)
     - Sink detection (7 vulnerability types)
     - Sanitization detection (6 sanitization types)
     - Taint label propagation
     - Vulnerability detection with source-to-sink path tracking
     - Worklist algorithm with Set-based deduplication
     - Note: Inter-procedural taint propagation planned for v1.6+
   
   - **CallGraphAnalyzer.ts**: Call graph construction (Phase 1)
     - Function call extraction from CFG statements
     - Caller/callee relationship mapping
     - Direct recursion detection
     - Mutual recursion detection using DFS
     - Tail recursion identification
   
   - **CallGraphAnalyzer.Extensions.ts**: Advanced call graph analysis (Phase 2)
     - External function identification (5 categories: STDLIB, CSTDLIB, POSIX, SYSTEM, UNKNOWN)
     - Pre-defined summaries for 13+ common library functions (printf, scanf, malloc, free, strcpy, memcpy, open, read, write, close, system, exit, etc.)
     - Recursion depth calculation
     - Strongly connected components (Tarjan's algorithm)
     - Call statistics and metrics
   
   - **InterProceduralReachingDefinitions.ts**: Inter-procedural dataflow (Phase 3)
     - Context-insensitive analysis
     - Definition propagation through function calls
     - Parameter mapping
     - Return value propagation
     - Global variable handling
     - Fixed-point iteration with MAX_ITERATIONS
   
   - **ParameterAnalyzer.ts**: Parameter mapping (Phase 4)
     - 7 types of argument derivations (direct, expression, composite, address, call, dereference, array access)
     - Sophisticated parameter-to-argument mapping
   
   - **ReturnValueAnalyzer.ts**: Return value analysis (Phase 4)
     - 6 return value types (variable, expression, call, constant, conditional, void)
     - Return value extraction and tracking
   
   - **FunctionSummaries.ts**: Library function summaries (Phase 4)
     - Pre-defined models for common C library functions
     - Parameter effects and return value tracking
   
   - **SecurityAnalyzer.ts**: Vulnerability pattern detection and attack path construction

3. **Visualization Layer**
   - `CFGVisualizer.ts`: Webview-based interactive CFG visualization
   - Uses vis-network for graph rendering
   - Displays blocks in topological order (academic CFG standard)
   - Shows liveness, reaching definitions, and taint information on blocks
   - Real-time updates and interactive features
   - Color-coded blocks for vulnerability severity
   - Tabbed interface: CFG, Call Graph, Parameters & Returns, Inter-Procedural, Taint Analysis, Interconnected CFG
   - Separate information windows for block info and call graph info
   - Debug toggle for debug information panel
   - Interconnected CFG visualization with three edge types

4. **State Management**
   - `StateManager.ts`: Handles persistence of analysis state
   - JSON-based storage in `.vscode/dataflow-state.json`
   - Per-workspace state management
   - Preserves analysis data across sessions

## Technical Details

### Dataflow Analysis Algorithms

#### Liveness Analysis (Backward)

Academic formulation based on Dragon Book (Aho, Sethi, Ullman):

```
IN[B] = USE[B] ∪ (OUT[B] - DEF[B])
OUT[B] = ∪ IN[S] for all successors S of B

Iterate until fixed point (no changes in any IN/OUT set)
```

**Implementation:**
- Traverses CFG blocks in reverse postorder
- Iteratively computes IN/OUT sets
- Converges when no changes occur

#### Reaching Definitions (Forward)

Academic formulation based on Cooper & Torczon:

```
IN[B] = ∪ OUT[P] for all predecessors P of B
OUT[B] = GEN[B] ∪ (IN[B] - KILL[B])

GEN[B] = definitions generated in block B
KILL[B] = definitions killed (overwritten) in block B

Iterate until fixed point
```

**Implementation:**
- Collects all definitions in function upfront (including function parameters at entry block)
- Computes GEN and KILL sets for each block
- Iteratively propagates definitions
- Tracks propagation path for each definition: `sourceBlock -> ... -> currentBlock`
- MAX_ITERATIONS safety check (10 * number of blocks)
- Cycle detection in propagation paths (represented as `[cycle]*`)
- Enhanced to store full history for debugging and visualization

#### Taint Analysis (Forward)

Forward propagation with source/sink identification:

```
Sources: scanf, gets, fgets, read, network input, file I/O, environment, etc.
Sinks: printf, puts, write, sprintf, system, SQL queries, etc.
Sanitization: Input validation, encoding, escaping, whitelisting, etc.

For each statement:
  - If assignment: propagate taint from RHS to LHS
  - If sink: flag vulnerability if tainted variable used
  - If sanitization: remove taint from sanitized variables
  - Track path from source to sink
```

**Implementation:**
- Enhanced source registry with 7 categories
- Sink registry with 7 vulnerability types
- Sanitization registry with 6 sanitization types
- Taint label propagation (USER_INPUT, FILE_CONTENT, NETWORK_DATA, etc.)
- Vulnerability detection with source-to-sink path tracking
- Worklist algorithm with Set-based deduplication
- Note: Inter-procedural taint propagation planned for v1.6+

#### Inter-Procedural Analysis

**Call Graph Construction:**
- Extracts function calls from CFG statements
- Builds caller/callee relationship maps
- Detects direct, mutual, and tail recursion
- Identifies external/library functions

**Inter-Procedural Dataflow:**
- Fixed-point iteration across function boundaries
- Parameter mapping (7 derivation types)
- Return value tracking (6 return types)
- Global variable handling
- Function summaries for library functions

### CFG Generation Pipeline

1. **Source File** → `cfg-exporter` (C++ tool)
2. `cfg-exporter` uses `clang::CFG::buildCFG()`
3. Generates JSON with CFG structure (blocks, edges, statements)
4. `ClangASTParser.ts` parses JSON
5. `EnhancedCPPParser.ts` extracts function information
6. Entry/exit block detection using graph-theoretic properties
7. `DataflowAnalyzer.ts` orchestrates analyses
8. Results stored and visualized

### Academic Correctness

- Uses official `clang::CFG::buildCFG()` from libclang/LLVM
- CFG follows academic standard: Entry → Basic Blocks → Exit
- Entry block = block with no predecessors
- Exit block = block with no successors
- Each block has statements, predecessors, successors
- Dataflow equations match standard compiler textbooks
- Topological sorting for visualization follows academic standards
- Propagation paths track complete flow through CFG
- Function parameters initialized as definitions at entry (academic standard)
- MAX_ITERATIONS safety checks prevent infinite loops
- Cycle detection in propagation paths

## Vulnerability Detection

### Supported Vulnerability Types

1. **Buffer Overflow** (CWE-120)
   - Unsafe buffer operations (strcpy, strcat, sprintf, gets)
   - Missing bounds checking

2. **Use After Free** (CWE-416)
   - Pointer use after free() call
   - Memory corruption risks

3. **Double Free** (CWE-415)
   - Multiple free() calls on same pointer

4. **Format String Vulnerability** (CWE-134)
   - User-controlled format strings
   - printf family functions

5. **Command Injection** (CWE-78)
   - system(), popen(), exec*() with tainted input

6. **SQL Injection** (CWE-89)
   - Unsafe SQL query construction

7. **Path Traversal** (CWE-22)
   - Unsafe file operations

8. **Uninitialized Variable** (CWE-457)
   - Use of uninitialized variables

9. **Taint-Based Vulnerabilities**
   - Detected when tainted data reaches security sinks without sanitization
   - Includes all above types when taint analysis is enabled

### Attack Path Analysis

Each vulnerability includes:
- **Source Blocks**: Where tainted data enters (cyan)
- **Propagation Blocks**: Intermediate blocks (orange)
- **Sink Blocks**: Where vulnerabilities occur (red)
- **Complete Path**: Step-by-step CFG traversal
- **CWE Information**: Link to MITRE CWE database
- **Recommendations**: How to fix the vulnerability

## Development

### Prerequisites

- Node.js 20+
- npm or yarn
- TypeScript 5+
- VSCode 1.80+
- CMake 3.16+
- Clang/LLVM 21.1.5+

### Setup Development Environment

```bash
# Clone repository
git clone <repository-url>
cd vscode-dataflow-analyzer

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch

# Build CFG exporter
cd cpp-tools/cfg-exporter
mkdir -p build && cd build
cmake ..
cmake --build .
```

### Docker Support (Windows/Linux/Mac)

The project includes Docker support for easy building and development without installing all dependencies locally.

**Quick Start:**
```powershell
# Windows PowerShell
.\build-docker.ps1 build
.\build-docker.ps1 dev

# Linux/Mac
./build-docker.sh build
./build-docker.sh dev
```

**Package Extension:**
```powershell
# Build and package as .vsix file
.\build-docker.ps1 package

# Install in VS Code: Extensions → ... → Install from VSIX → dist/dataflow-analyzer.vsix
```

For detailed Docker documentation, see:
- [DOCKER_FULL_LINUX_VM_WINDOWS.md](DOCKER_FULL_LINUX_VM_WINDOWS.md) - Fully dockerized Linux VM on Windows AMD x64
- [DOCKER_QUICKSTART.md](DOCKER_QUICKSTART.md) - Quick start guide
- [DOCKER.md](DOCKER.md) - Complete Docker documentation

### Build Scripts Reference

- `npm run compile` - Compile TypeScript once
- `npm run watch` - Watch mode (continuous compilation)
- `npm run lint` - Run ESLint
- `npm test` - Run tests (if configured)
- `npm run vscode:prepublish` - Prepare for publishing

### Debugging

1. Open the project in VSCode
2. Press `F5` to launch Extension Development Host
3. Set breakpoints in TypeScript files
4. Use VSCode debugger

## Security Considerations

This tool is designed for:
- **Static Analysis**: Analyzing source code without execution
- **Security Research**: Understanding vulnerabilities and exploits
- **Code Review**: Identifying potential security issues
- **Education**: Learning about dataflow analysis and security

**Note**: This tool is not a replacement for:
- Dynamic analysis tools
- Fuzzing
- Penetration testing
- Security audits

## License

[Specify your license here]

## Acknowledgments

- Uses [vis-network](https://visjs.github.io/vis-network/) for graph visualization
- Integrates with clang/LLVM for AST parsing and CFG generation
- Built on VSCode Extension API
- Algorithms from Dragon Book (Aho, Sethi, Ullman) and Engineering a Compiler (Cooper & Torczon)

## References

- [CWE - Common Weakness Enumeration](https://cwe.mitre.org/)
- [Clang Documentation](https://clang.llvm.org/docs/)
- [VSCode Extension API](https://code.visualstudio.com/api)
- [Dataflow Analysis](https://en.wikipedia.org/wiki/Data-flow_analysis)
- [Dragon Book](https://www.pearsonhighered.com/program/Aho-Compilers-Principles-Techniques-and-Tools-2nd-Edition/PGM310509.html)
- [Engineering a Compiler](https://www.elsevier.com/books/engineering-a-compiler/cooper/978-0-12-811905-1)

## Known Issues

- Inter-procedural analysis context sensitivity is limited (context-insensitive only)
- Some complex C++ features may not be fully parsed
- Performance may degrade on very large codebases
- Interconnected CFG visualization: Orange (data flow) and blue (function call) edges may not appear correctly in some cases

## Version History

- **v1.9.2**: Enhanced Logging & Windows Support
  - Added comprehensive logging for function, node, edge, and legend counts
  - Fixed Windows path handling for cfg-exporter binary
  - Improved cross-platform binary detection
  - Enhanced error messages with platform-specific build instructions
  - Added synthetic taint visualization (Magenta color for return statements without variables)
  - Improved state source indicator (yellow for saved state, light blue for current analysis)

- **v1.9.1**: Sensitivity Mismatch Detection & Visualization Fixes
  - Fixed tab switching sensitivity mismatch detection
  - Automatic re-analysis trigger when sensitivity changes
  - Enhanced visualization data regeneration on sensitivity change
  - Added extensive logging for debugging sensitivity issues
  - Improved error handling for sensitivity mismatches
  - Added synthetic taint detection for return statements without variables

- **v1.9.0**: Recursive Control-Dependent Taint Propagation & 5 Configurable Sensitivity Levels
  - Implemented recursive control-dependent taint propagation (implicit flow tracking)
  - Added 5 configurable sensitivity levels: MINIMAL, CONSERVATIVE, BALANCED, PRECISE, MAXIMUM
  - Path-sensitive analysis for PRECISE/MAXIMUM levels
  - Field-sensitive analysis for PRECISE/MAXIMUM levels
  - Context-sensitive analysis for MAXIMUM level
  - Flow-sensitive analysis for MAXIMUM level
  - Enhanced visualization: Yellow (data-flow), Orange (control-dependent), Purple (mixed)
  - Dynamic block sizing based on content
  - Edge type toggles (Control Flow, Function Calls, Data Flow)
  - Manual save state button in header
  - Save states list tracking (`.vscode/save-states-list.json`)
  - Enhanced incremental analysis with SHA-256 file hashing
  - Comprehensive logging (DEBUG, INFO, WARN, ERROR) throughout codebase
  - Re-analyze button for sensitivity changes
  - Fixed sensitivity switching to properly trigger re-analysis

- **v1.5.1**: Documentation consolidation - merged all technical docs into README.md and FUTURE_PLANS.md
- **v1.5.0**: Interconnected CFG visualization with red-highlighted function nodes
- **v1.4.0**: Fix critical code review issues, improved entry/exit block detection
- **v1.3.0**: Enhanced taint analysis with sanitization, vulnerability detection, and GUI integration
- **v1.2.0**: Inter-Procedural Analysis (IPA) with Call Graphs, Parameter Analysis, and Enhanced GUI
- **v1.1.1**: Add comprehensive code comments to analyzer modules
- **v1.1.0**: Fixed reaching definitions analysis with full propagation tracking

---

**Built with trust for security researchers and developers**

**Version**: 1.5.1  
**Last Updated**: January 2025 (v1.9.5.1)

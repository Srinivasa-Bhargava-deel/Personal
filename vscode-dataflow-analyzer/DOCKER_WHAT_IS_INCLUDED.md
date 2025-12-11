# What's Included in Docker vs What You Need to Install

Complete breakdown of what Docker handles automatically vs what needs to be installed on Windows.

## ✅ What Docker Container Includes Automatically

When you build the Docker image, it **automatically installs** everything needed:

### C++ Build Tools (Stage 1: cpp-builder)

```dockerfile
# Automatically installed in Docker container:
- build-essential (gcc, g++, make, etc.)
- cmake (latest version)
- ninja-build (build system)
- git
- wget, curl
- LLVM/Clang 17 (complete installation)
  - llvm-17
  - clang-17
  - libclang-17-dev
  - llvm-17-dev
```

**You do NOT need to install these on Windows!**

### TypeScript/Node.js Tools (Stage 2: extension-builder)

```dockerfile
# Automatically included via Node.js base image:
- Node.js 20 (LTS)
- npm (comes with Node.js)
- TypeScript (installed via npm ci)
- All npm dependencies from package.json
- Build tools (python3, make, g++) if needed for native modules
```

**You do NOT need to install these on Windows!**

### Extension Packaging Tools

```dockerfile
# Automatically installed when packaging:
- vsce (VS Code Extension Manager)
  Installed via: npm install -g vsce
```

**You do NOT need to install vsce on Windows!**

## ❌ What You MUST Install on Windows

### Required on Windows Host

1. **Docker Desktop for Windows**
   - Handles all containerization
   - Includes WSL 2 backend
   - Download: https://www.docker.com/products/docker-desktop/

2. **VS Code**
   - Needed to install and use the extension
   - Extension Development Host is included
   - Download: https://code.visualstudio.com/
   - Version: 1.80.0 or higher

3. **Git for Windows**
   - Needed to clone the repository
   - Download: https://git-scm.com/download/win

### Optional on Windows Host

- **PowerShell** (comes with Windows)
- **WSL 2** (installed automatically with Docker Desktop)

## 🔍 Detailed Breakdown

### What Gets Built in Docker Container

| Component | Installed In Docker? | Installed On Windows? |
|-----------|---------------------|----------------------|
| **LLVM/Clang 17** | ✅ Yes (automatic) | ❌ No |
| **CMake** | ✅ Yes (automatic) | ❌ No |
| **Build Tools** (g++, make) | ✅ Yes (automatic) | ❌ No |
| **Node.js 20** | ✅ Yes (base image) | ❌ No |
| **TypeScript** | ✅ Yes (via npm) | ❌ No |
| **npm dependencies** | ✅ Yes (automatic) | ❌ No |
| **vsce** | ✅ Yes (when packaging) | ❌ No |
| **Docker Desktop** | ❌ No | ✅ Yes (required) |
| **VS Code** | ❌ No | ✅ Yes (required) |
| **Git** | ❌ No | ✅ Yes (required) |

## 📦 Docker Build Process

### Stage 1: C++ Builder Container

```dockerfile
FROM ubuntu:22.04 AS cpp-builder

# Automatically installs:
RUN apt-get install -y \
    build-essential \    # gcc, g++, make
    cmake \              # CMake build system
    ninja-build \        # Fast build system
    llvm-17 \            # LLVM compiler infrastructure
    clang-17 \           # Clang C++ compiler
    libclang-17-dev \    # Clang development libraries
    llvm-17-dev          # LLVM development files

# Builds cfg-exporter binary
RUN cmake .. && cmake --build .
```

**Result**: C++ binary built with all dependencies included

### Stage 2: Extension Builder Container

```dockerfile
FROM node:20-slim AS extension-builder

# Node.js 20 already included in base image
# Automatically installs:
RUN npm ci  # Installs all dependencies from package.json
            # Including: TypeScript, @types/vscode, etc.

# Compiles TypeScript
RUN npm run compile
```

**Result**: Compiled JavaScript extension files

### Stage 3: Final Container

```dockerfile
FROM node:20-slim

# Copies built files from previous stages
COPY --from=extension-builder /build/out ./out
COPY --from=cpp-builder /build/cfg-exporter ./cpp-tools/cfg-exporter/build/
```

**Result**: Complete extension with all dependencies

## 🎯 Summary

### On Windows Host - Install ONLY:

1. ✅ **Docker Desktop** (handles everything else)
2. ✅ **VS Code** (to use the extension)
3. ✅ **Git** (to clone repository)

### In Docker Container - Automatically Includes:

1. ✅ **LLVM/Clang 17** (C++ compiler)
2. ✅ **CMake** (build system)
3. ✅ **Build Tools** (g++, make, etc.)
4. ✅ **Node.js 20** (JavaScript runtime)
5. ✅ **TypeScript** (compiler)
6. ✅ **All npm dependencies** (from package.json)
7. ✅ **vsce** (extension packager)

## 💡 Key Takeaway

**You only need 3 things on Windows:**
- Docker Desktop
- VS Code
- Git

**Everything else is handled automatically by Docker!**

No need to:
- Install LLVM/Clang
- Install CMake
- Install Node.js
- Install TypeScript
- Install Visual Studio Build Tools
- Install any C++ compilers
- Configure build environments
- Manage dependencies

Docker does it all! 🐳


# Docker Setup for VS Code Dataflow Analyzer

This guide explains how to build and run the VS Code Dataflow Analyzer extension using Docker on Windows.

> **⚠️ Windows Users**: Docker builds Linux binaries. The extension package (.vsix) works on Windows, but you'll need to build the Windows C++ binary (`cfg-exporter.exe`) separately. See [DOCKER_WINDOWS_COMPATIBILITY.md](DOCKER_WINDOWS_COMPATIBILITY.md) for complete details.

> **✅ AMD x64 Users**: Docker works perfectly on AMD x64 (64-bit) Windows PCs! See [DOCKER_WINDOWS_AMD64.md](DOCKER_WINDOWS_AMD64.md) for complete AMD x64 64-bit instructions.

## Prerequisites

1. **Docker Desktop for Windows** - Install from [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. **WSL 2** (Windows Subsystem for Linux) - Required for Docker Desktop
3. **Git** - For cloning the repository

## Quick Start

### 1. Build the Docker Image

```powershell
# Navigate to the project directory
cd vscode-dataflow-analyzer

# Build the Docker image
docker build -t vscode-dataflow-analyzer .
```

This will:
- Build the C++ `cfg-exporter` binary with LLVM/Clang
- Compile the TypeScript extension
- Package everything into a single image

### 2. Run the Container

```powershell
# Run a container interactively
docker run -it --rm vscode-dataflow-analyzer bash

# Or run with volume mounts for development
docker run -it --rm `
  -v ${PWD}/src:/app/src `
  -v ${PWD}/out:/app/out `
  -v ${PWD}/tests:/app/tests `
  vscode-dataflow-analyzer bash
```

## Using Docker Compose

### Development Mode

```powershell
# Start development container
docker-compose up dev

# In another terminal, execute commands in the container
docker-compose exec dev npm run compile
docker-compose exec dev npm test
```

### Build Only

```powershell
# Build the extension
docker-compose run --rm builder
```

## Building the Extension Package (.vsix)

To create a VSIX package that can be installed in VS Code:

```powershell
# Build the image first
docker build -t vscode-dataflow-analyzer .

# Run container and package extension (using helper script)
# Note: Script is mounted read-only, so we run it directly with bash
# The helper script uses @vscode/vsce with --allow-missing-repository flag (safe for Docker)
docker run --rm `
  -v ${PWD}/dist:/app/dist `
  -v ${PWD}/docker-package.sh:/tmp/docker-package.sh:ro `
  -w /app `
  vscode-dataflow-analyzer `
  bash /tmp/docker-package.sh
```

## Windows-Specific Considerations

### File Paths

Docker on Windows uses forward slashes in paths. When mounting volumes:

```powershell
# Correct - use forward slashes or ${PWD}
-v ${PWD}/src:/app/src

# Incorrect - avoid Windows backslashes
-v C:\Users\...\src:/app/src  # May cause issues
```

### Line Endings

If you encounter line ending issues:

```powershell
# Configure Git to use LF line endings
git config core.autocrlf false

# Or convert files
docker run --rm -v ${PWD}:/workspace alpine/linux sh -c "apk add dos2unix && find /workspace -type f -name '*.sh' -exec dos2unix {} \;"
```

### Building C++ Binary on Windows Host

If you want to build the C++ binary directly on Windows (outside Docker):

1. Install LLVM from [LLVM Releases](https://github.com/llvm/llvm-project/releases)
2. Install CMake
3. Use the `WindowsCMakeLists.txt` file:

```powershell
cd cpp-tools\cfg-exporter
mkdir build
cd build
cmake .. -G "Visual Studio 17 2022" -A x64 -DCMAKE_TOOLCHAIN_FILE=../../WindowsCMakeLists.txt
cmake --build . --config Release
```

## Multi-Stage Build Details

The Dockerfile uses a multi-stage build:

1. **cpp-builder**: Builds the C++ `cfg-exporter` binary with LLVM/Clang
2. **extension-builder**: Compiles the TypeScript extension
3. **Final stage**: Packages everything together

## Troubleshooting

For comprehensive troubleshooting, see [DOCKER_TROUBLESHOOTING.md](DOCKER_TROUBLESHOOTING.md) which covers:
- Permission errors (chmod issues)
- GPG key import errors
- apt-get update failures
- Network timeout issues
- vsce repository detection errors
- Docker build cache issues

### Issue: LLVM not found

If CMake can't find LLVM:

```powershell
# Check LLVM installation in container
docker run --rm vscode-dataflow-analyzer ls -la /usr/lib/llvm-17

# Or specify LLVM_DIR manually
docker build --build-arg LLVM_DIR=/usr/lib/llvm-17/lib/cmake/llvm -t vscode-dataflow-analyzer .
```

### Issue: Permission denied

On Windows, you may need to:

1. Enable file sharing in Docker Desktop settings
2. Add your project directory to shared drives
3. Run Docker Desktop as Administrator if needed

### Issue: Build fails with "out of memory"

Increase Docker Desktop memory allocation:
- Docker Desktop → Settings → Resources → Memory
- Increase to at least 4GB (8GB recommended)

## Development Workflow

### Option 1: Full Docker Development

```powershell
# Start development container
docker-compose up -d dev

# Compile TypeScript
docker-compose exec dev npm run compile

# Run tests
docker-compose exec dev npm test

# Watch mode
docker-compose exec dev npm run watch
```

### Option 2: Hybrid (Build in Docker, Run Locally)

```powershell
# Build extension in Docker
docker-compose run --rm builder

# Extension is now in ./out directory
# Install in VS Code: F5 (Debug) or package as .vsix
```

## Building for Production

```powershell
# Build optimized image
docker build --target production -t vscode-dataflow-analyzer:latest .

# Tag for registry (if pushing)
docker tag vscode-dataflow-analyzer:latest your-registry/vscode-dataflow-analyzer:latest

# Push to registry
docker push your-registry/vscode-dataflow-analyzer:latest
```

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Build Extension

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: docker build -t vscode-dataflow-analyzer .
      - name: Package extension
        run: |
          # Helper script uses @vscode/vsce with --allow-missing-repository flag (safe for Docker)
          docker run --rm -v $PWD/dist:/app/dist -v $PWD/docker-package.sh:/tmp/docker-package.sh:ro -w /app \
            vscode-dataflow-analyzer \
            bash /tmp/docker-package.sh
      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: extension
          path: dist/*.vsix
```

## Additional Resources

- [DOCKER_TROUBLESHOOTING.md](DOCKER_TROUBLESHOOTING.md) - Comprehensive troubleshooting guide
- [DOCKER_QUICKSTART.md](DOCKER_QUICKSTART.md) - Quick start guide
- [DOCKER_FULL_LINUX_VM_WINDOWS.md](DOCKER_FULL_LINUX_VM_WINDOWS.md) - Complete Linux Docker VM on Windows guide
- [Docker Desktop for Windows](https://docs.docker.com/desktop/windows/)
- [VS Code Extension Packaging](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [LLVM Docker Images](https://hub.docker.com/r/library/llvm)


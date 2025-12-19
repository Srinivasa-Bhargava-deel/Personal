# Docker Quick Start Guide

## 🚀 Recommended: VS Code Remote Containers

The **fastest and easiest** way to get started is using **VS Code Remote Containers**. This provides a fully configured development environment.

### Quick Setup (3 Steps)

1. **Install VS Code Extensions**
   - Open VS Code
   - Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on macOS)
   - Install: **Remote - Containers** (`ms-vscode-remote.remote-containers`)
   - Optional: Install **Docker** (`ms-azuretools.vscode-docker`)

2. **Install Docker Desktop**
   - **Windows**: [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
   - **macOS**: [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)
   - **Linux**: [Docker Engine](https://docs.docker.com/engine/install/)

3. **Open in Container**
   - Open project: `code /path/to/vscode-dataflow-analyzer`
   - Press `F1` → Type: `Remote-Containers: Reopen in Container`
   - Wait for container to build (first time: ~10-15 minutes)
   - Press `F5` to run extension!

**That's it!** The container includes everything: Node.js, TypeScript, LLVM/Clang, CMake, and all dependencies.

---

## Manual Docker Setup (Alternative)

If you prefer manual Docker commands instead of Remote Containers, follow the instructions below.

## For Windows Users

> **⚠️ Important**: Docker builds Linux binaries. For the extension to work on Windows, you'll also need to build the Windows C++ binary separately. See [DOCKER_WINDOWS_COMPATIBILITY.md](DOCKER_WINDOWS_COMPATIBILITY.md) for details.

> **✅ AMD x64 Users**: Docker works perfectly on AMD x64 (64-bit) Windows PCs! See [DOCKER_WINDOWS_AMD64.md](DOCKER_WINDOWS_AMD64.md) for complete AMD x64 instructions.

### Prerequisites
1. Install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) (AMD64/x64 version)
2. Enable WSL 2 backend in Docker Desktop settings
3. Open PowerShell as Administrator (if needed)
4. **Note**: You'll still need to build `cfg-exporter.exe` locally (see WINDOWS_BUILD_INSTRUCTIONS.md)
5. **AMD x64**: Ensure virtualization (SVM) is enabled in BIOS

### Quick Build

```powershell
# Build the Docker image
.\build-docker.ps1 build

# Or use Docker directly
docker build -t vscode-dataflow-analyzer .
```

### Run Development Container

```powershell
# Start development container
.\build-docker.ps1 dev

# Execute commands in container
docker-compose exec dev npm run compile
docker-compose exec dev npm test
docker-compose exec dev bash
```

### Package Extension

```powershell
# Build and package as .vsix
.\build-docker.ps1 package

# Or with fresh build (no cache):
.\build-docker.ps1 package -NoCache

# Install in VS Code:
# 1. Open VS Code
# 2. Extensions → ... → Install from VSIX
# 3. Select dist/dataflow-analyzer.vsix
```

### Common Commands

```powershell
# Build image
docker build -t vscode-dataflow-analyzer .

# Run interactively
docker run -it --rm vscode-dataflow-analyzer bash

# Run with volume mounts
docker run -it --rm `
  -v ${PWD}/src:/app/src `
  -v ${PWD}/out:/app/out `
  vscode-dataflow-analyzer bash

# Clean up
.\build-docker.ps1 clean
```

## Troubleshooting

For detailed troubleshooting, see [DOCKER_TROUBLESHOOTING.md](DOCKER_TROUBLESHOOTING.md) which covers common issues and solutions.

### "Docker daemon not running"
- Start Docker Desktop
- Wait for it to fully start (whale icon in system tray)

### "Permission denied" on volumes
- Docker Desktop → Settings → Resources → File Sharing
- Add your project directory to shared drives

### "Build fails with LLVM errors"
- Ensure Docker has at least 4GB RAM allocated
- Docker Desktop → Settings → Resources → Memory

### "Windows containers not working"
- Docker Desktop → Settings → General
- Uncheck "Use the WSL 2 based engine" (if using Windows containers)
- Note: Linux containers are recommended and work better

## Next Steps

- **🚀 Recommended**: Use **VS Code Remote Containers** (see top of this file) - easiest setup!
- **Fully Dockerized Setup**: See [DOCKER_FULL_LINUX_VM_WINDOWS.md](DOCKER_FULL_LINUX_VM_WINDOWS.md) for complete Linux Docker VM on Windows AMD x64 instructions
- See [DOCKER.md](DOCKER.md) for detailed documentation
- **Troubleshooting**: See [DOCKER_TROUBLESHOOTING.md](DOCKER_TROUBLESHOOTING.md) for comprehensive troubleshooting guide
- See [DOCKER_WINDOWS_COMPATIBILITY.md](DOCKER_WINDOWS_COMPATIBILITY.md) for Windows-specific compatibility information
- **AMD x64 Users**: See [DOCKER_WINDOWS_AMD64.md](DOCKER_WINDOWS_AMD64.md) for complete AMD x64 64-bit instructions
- See [WINDOWS_BUILD_INSTRUCTIONS.md](WINDOWS_BUILD_INSTRUCTIONS.md) for building the Windows C++ binary


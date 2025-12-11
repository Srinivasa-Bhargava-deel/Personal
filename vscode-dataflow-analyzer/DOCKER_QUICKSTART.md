# Docker Quick Start Guide

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

- **Fully Dockerized Setup**: See [DOCKER_FULL_LINUX_VM_WINDOWS.md](DOCKER_FULL_LINUX_VM_WINDOWS.md) for complete Linux Docker VM on Windows AMD x64 instructions
- See [DOCKER.md](DOCKER.md) for detailed documentation
- See [DOCKER_WINDOWS_COMPATIBILITY.md](DOCKER_WINDOWS_COMPATIBILITY.md) for Windows-specific compatibility information
- **AMD x64 Users**: See [DOCKER_WINDOWS_AMD64.md](DOCKER_WINDOWS_AMD64.md) for complete AMD x64 64-bit instructions
- See [WINDOWS_BUILD_INSTRUCTIONS.md](WINDOWS_BUILD_INSTRUCTIONS.md) for building the Windows C++ binary


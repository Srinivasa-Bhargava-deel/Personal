# How to Delete Docker Cache and Do a Fresh Build

Complete guide for clearing Docker cache and performing a fresh build on Windows AMD x64.

## Quick Commands

### Option 1: Fresh Package Build (Recommended)

```powershell
# Package without using Docker cache
.\build-docker.ps1 package -NoCache

# Or clean everything first, then package
.\build-docker.ps1 cleanall
.\build-docker.ps1 package -NoCache
```

### Option 2: Clean Build Using PowerShell Script

```powershell
# Clean everything and rebuild
.\build-docker.ps1 cleanall
.\build-docker.ps1 build -NoCache
```

### Option 3: Manual Docker Clean Commands

```powershell
# Stop all running containers
docker-compose down

# Remove all containers
docker container prune -f

# Remove all images (including the one we built)
docker image prune -a -f

# Remove build cache
docker builder prune -a -f

# Remove all unused Docker resources
docker system prune -a -f

# Now rebuild without cache
.\build-docker.ps1 build -NoCache
```

## Detailed Cleanup Steps

### Step 1: Stop Running Containers

```powershell
# Stop containers from docker-compose
docker-compose down

# Or stop specific containers
docker stop $(docker ps -q)

# Remove stopped containers
docker container prune -f
```

### Step 2: Remove Docker Images

```powershell
# List images to see what we have
docker images

# Remove specific image
docker rmi vscode-dataflow-analyzer:latest

# Remove all unused images
docker image prune -a -f

# Force remove (if image is in use)
docker rmi -f vscode-dataflow-analyzer:latest
```

### Step 3: Clear Build Cache

```powershell
# Remove build cache (saves space, forces fresh download)
docker builder prune -a -f

# Or just remove unused build cache
docker builder prune -f
```

### Step 4: Complete System Cleanup

```powershell
# Remove everything: containers, images, networks, build cache
docker system prune -a -f

# With volumes (be careful - removes volumes too!)
docker system prune -a --volumes -f
```

### Step 5: Fresh Build

```powershell
# Build without using cache
.\build-docker.ps1 build -NoCache

# Or using Docker directly
docker build --no-cache --platform linux/amd64 -t vscode-dataflow-analyzer:latest .
```

## Complete Fresh Build Script

Save this as `fresh-build.ps1`:

```powershell
# PowerShell script for complete fresh Docker build

Write-Host "=== Step 1: Stopping containers ===" -ForegroundColor Cyan
docker-compose down 2>$null

Write-Host "=== Step 2: Removing containers ===" -ForegroundColor Cyan
docker container prune -f

Write-Host "=== Step 3: Removing images ===" -ForegroundColor Cyan
docker rmi vscode-dataflow-analyzer:latest 2>$null
docker image prune -a -f

Write-Host "=== Step 4: Clearing build cache ===" -ForegroundColor Cyan
docker builder prune -a -f

Write-Host "=== Step 5: Fresh build (no cache) ===" -ForegroundColor Cyan
.\build-docker.ps1 build -NoCache

Write-Host "=== Done! ===" -ForegroundColor Green
```

## What Each Command Does

| Command | What It Removes |
|---------|----------------|
| `docker-compose down` | Stops and removes containers from docker-compose |
| `docker container prune -f` | Removes all stopped containers |
| `docker image prune -a -f` | Removes all unused images |
| `docker builder prune -a -f` | Removes all build cache |
| `docker system prune -a -f` | Removes everything (containers, images, networks, cache) |
| `docker rmi <image>` | Removes specific image |
| `--no-cache` flag | Builds without using cached layers |

## When to Use Fresh Build

Use a fresh build when:
- ✅ Build is failing and you suspect cache issues
- ✅ Dependencies have changed (package.json, CMakeLists.txt)
- ✅ You want to ensure everything downloads fresh
- ✅ Debugging build issues
- ✅ After updating Dockerfile

## Space Savings

After cleanup, check space saved:

```powershell
# Check Docker disk usage
docker system df

# Before cleanup example:
# Images: 5.2GB
# Containers: 150MB
# Build Cache: 2.1GB

# After cleanup:
# Images: 0B
# Containers: 0B
# Build Cache: 0B
```

## Troubleshooting

For comprehensive troubleshooting, see [DOCKER_TROUBLESHOOTING.md](DOCKER_TROUBLESHOOTING.md) which covers:
- Permission errors (chmod issues)
- GPG key import errors
- apt-get update failures
- Network timeout issues
- vsce repository detection errors
- Docker build cache issues

### Common Issues

### Issue: "Image is being used by running container"

**Solution:**
```powershell
# Stop containers first
docker-compose down
docker stop $(docker ps -q)

# Then remove image
docker rmi -f vscode-dataflow-analyzer:latest
```

### Issue: "Cannot remove image, it is being used"

**Solution:**
```powershell
# Force remove
docker rmi -f vscode-dataflow-analyzer:latest

# Or remove all unused images
docker image prune -a -f
```

### Issue: "Build still uses cache after cleanup"

**Solution:**
```powershell
# Explicitly use --no-cache flag
.\build-docker.ps1 build -NoCache

# Or
docker build --no-cache --platform linux/amd64 -t vscode-dataflow-analyzer:latest .
```

## Quick Reference

```powershell
# Fresh package build (no cache)
.\build-docker.ps1 package -NoCache

# Complete cleanup and fresh build (one-liner)
docker-compose down; docker system prune -a -f; .\build-docker.ps1 build -NoCache

# Complete cleanup and fresh package
docker-compose down; docker system prune -a -f; .\build-docker.ps1 package -NoCache

# Just clear cache and rebuild
docker builder prune -a -f; .\build-docker.ps1 build -NoCache

# Remove specific image and rebuild
docker rmi vscode-dataflow-analyzer:latest; .\build-docker.ps1 build -NoCache
```

## Summary

**For packaging (fresh build):**
```powershell
.\build-docker.ps1 package -NoCache
```

**Quickest way (build):**
```powershell
.\build-docker.ps1 cleanall
.\build-docker.ps1 build -NoCache
```

**Most thorough:**
```powershell
docker system prune -a -f
.\build-docker.ps1 build -NoCache
```

---

**Note**: `-f` flag means "force" (no confirmation prompt). Remove it if you want to confirm each step.

## Related Documentation

- **🚀 Recommended**: [DOCKER_QUICKSTART.md](DOCKER_QUICKSTART.md) - Quick start guide with Remote Containers
- [DOCKER_TROUBLESHOOTING.md](DOCKER_TROUBLESHOOTING.md) - Comprehensive troubleshooting guide (includes Remote Containers)
- [DOCKER.md](DOCKER.md) - Complete Docker documentation with Remote Containers instructions


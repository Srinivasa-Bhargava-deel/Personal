# Docker Troubleshooting Guide

This guide addresses common issues encountered when building and packaging the extension with Docker.

## Issue 1: Permission Error - "chmod: changing permissions of '/tmp/docker-package.sh': Read-only file system"

### Symptoms
```
chmod: changing permissions of '/tmp/docker-package.sh': Read-only file system
Packaging failed!
```

### Root Cause
The `docker-package.sh` script is mounted as read-only (`:ro` flag) for security reasons, but the build script was trying to make it executable with `chmod +x`.

### Solution
**Fixed in:** `build-docker.ps1`, `build-docker.sh`, and documentation

The script now runs directly with `bash /tmp/docker-package.sh` instead of trying to `chmod` it first. This works because bash can execute scripts even if they don't have execute permissions.

### Verification
Run the package command:
```powershell
.\build-docker.ps1 package
```

Or on Linux/macOS:
```bash
./build-docker.sh package
```

## Issue 2: GPG Key Import Error - "gpg: invalid radix64 character" / "Invalid keyring"

### Symptoms
```
gpg: invalid radix64 character 2E skipped
gpg: CRC error; E077E1 - 8FEE2A
gpg: read_block: read error: Invalid keyring
gpg: import from '-' failed: Invalid keyring
Installation failed. Waiting 40s before retry...
```

### Root Cause
The deprecated `apt-key add -` command is causing GPG key import failures in Ubuntu 22.04. The `apt-key` command has been deprecated and removed in newer Ubuntu versions, causing the GPG key import to fail.

### Solution
**Fixed in:** `Dockerfile`

Replaced deprecated `apt-key` with modern GPG key handling:
- Download GPG key to temporary file
- Use `gpg --dearmor` to convert key format
- Place key in `/etc/apt/trusted.gpg.d/` (modern location)
- Added `gnupg` package to ensure `gpg` command is available

### What Changed
**Before (deprecated):**
```dockerfile
wget -O - https://apt.llvm.org/llvm-snapshot.gpg.key | apt-key add -
```

**After (modern approach):**
```dockerfile
wget -O /tmp/llvm-snapshot.gpg.key https://apt.llvm.org/llvm-snapshot.gpg.key
gpg --dearmor < /tmp/llvm-snapshot.gpg.key > /etc/apt/trusted.gpg.d/llvm-snapshot.gpg
```

### Verification
The build should now complete successfully:
```powershell
.\build-docker.ps1 build -NoCache
```

## Issue 3: apt-get update Failure - LLVM Repository Update Errors

### Symptoms
```
ERROR: apt-get update failed (exit code: 1)
apt-get update failed
```

### Root Cause
The `apt-get update` command may fail after adding the LLVM repository due to:
- GPG key verification issues
- Repository configuration problems
- Network connectivity issues during update
- Repository server unavailability

### Solution
**Fixed in:** `Dockerfile`

Improved error handling for `apt-get update`:
- **Step-by-step validation**: Each step (GPG key download, conversion, repository setup) is validated before proceeding
- **Explicit error checking**: `apt-get update` exit code is checked explicitly
- **Better error messages**: Clear indication of which step failed
- **Automatic retry**: Failed `apt-get update` attempts are retried with exponential backoff

### What Changed
The installation process now:
1. Downloads GPG key and verifies success
2. Converts GPG key and verifies file creation
3. Creates repository file and verifies it exists
4. Runs `apt-get update` with explicit error checking
5. Only proceeds to package installation if update succeeds

### Verification
The build should show clear progress:
```powershell
Attempt 1/5: Installing LLVM...
Running apt-get update...
apt-get update completed successfully
LLVM installation successful!
```

## Issue 4: Network Timeout - LLVM Package Download Failures

### Symptoms
```
Error reading from server - read (5: Input/output error)
Unable to connect to apt.llvm.org:443
Connection refused
Failed to fetch https://apt.llvm.org/jammy/pool/main/l/llvm-toolchain-17/...
```

### Root Cause
Network connectivity issues when downloading LLVM packages from `apt.llvm.org`. This can happen due to:
- Slow or unstable internet connection
- Temporary server issues at apt.llvm.org
- Firewall/proxy restrictions
- Network timeouts

### Solution
**Fixed in:** `Dockerfile`

Added automatic retry logic with exponential backoff:
- **5 retry attempts** with increasing delays (10s, 20s, 40s, 80s, 160s)
- **60-second timeout** per download attempt
- **Connection retry** enabled for wget
- Clear error messages if all retries fail

### What Happens Now
1. First attempt: Downloads LLVM GPG key and packages
2. If it fails: Waits 10 seconds and retries
3. Each retry doubles the wait time
4. After 5 failed attempts: Shows clear error message

### If Retries Still Fail

**Option 1: Check Internet Connection**
```powershell
# Test connectivity to apt.llvm.org
Test-NetConnection apt.llvm.org -Port 443
```

**Option 2: Use a Different Network**
- Try a different Wi-Fi network
- Use a mobile hotspot
- Check if VPN is causing issues

**Option 3: Build During Off-Peak Hours**
- LLVM servers may be less busy during off-peak hours
- Try building at different times

**Option 4: Use Docker Build Cache**
If you've successfully built before, use cached layers:
```powershell
# Don't use -NoCache flag
.\build-docker.ps1 build
.\build-docker.ps1 package
```

**Option 5: Manual Retry**
Simply run the build command again - the retry logic will kick in automatically.

## Issue 5: Docker Build Cache Issues

### Symptoms
- Build succeeds but uses outdated code
- Unexpected behavior after code changes

### Solution
Use `-NoCache` flag for fresh builds:
```powershell
.\build-docker.ps1 build -NoCache
.\build-docker.ps1 package -NoCache
```

Or clean everything first:
```powershell
.\build-docker.ps1 cleanall
.\build-docker.ps1 build -NoCache
.\build-docker.ps1 package -NoCache
```

## Issue 6: vsce Repository Detection Error

### Symptoms
```
ERROR  Couldn't detect the repository where this extension is published. 
The link 'WINDOWS_BUILD_INSTRUCTIONS.md' will be broken in README.md. 
GitHub/GitLab repositories will be automatically detected. Otherwise, 
please provide the repository URL in package.json or use the --baseContentUrl 
and --baseImagesUrl options.
```

### Root Cause
The `vsce` (VS Code Extension Manager) tool validates links in README.md files and requires a repository URL to validate relative links. When packaging in Docker, the git remote might not be available, causing `vsce` to fail.

### Solution
**Fixed in:** `docker-package.sh`

Added `--allow-missing-repository` flag to the `vsce package` command:
- Allows packaging even when repository URL can't be detected
- Skips repository validation for relative links in README.md
- **Completely safe** - only affects link validation, not extension code or security
- Common practice in Docker/CI/CD environments

### Safety Note
✅ **It's safe to use this flag:**
- Does NOT affect extension functionality or security
- Does NOT change the packaged extension code
- Only skips validation of README.md links
- Extension will work identically whether flag is used or not
- The only minor downside: broken links in README won't be caught during packaging

### What Changed
**Before:**
```bash
vsce package --out /app/dist/dataflow-analyzer.vsix
```

**After:**
```bash
vsce package --out /app/dist/dataflow-analyzer.vsix --allow-missing-repository
```

### Verification
The package command should now complete successfully:
```powershell
.\build-docker.ps1 package
```

### Alternative Solution
**Fixed in:** `package.json` and `docker-package.sh`

The repository URL has been added to `package.json`:
```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/Srinivasa-Bhargava-deel/Personal.git"
  }
}
```

The `docker-package.sh` script now:
1. First tries with `--allow-missing-repository` flag (if supported)
2. Falls back to regular packaging (which works because repository URL is in package.json)

This ensures packaging works even if the flag isn't supported in the vsce version being used.

## Issue 7: Docker Compose Version Warning

### Symptoms
```
level=warning msg="docker-compose.yml: the attribute `version` is obsolete"
```

### Root Cause
Docker Compose v2+ doesn't require the `version` field in `docker-compose.yml`.

### Solution
This is just a warning and doesn't affect functionality. The `version` field can be removed from `docker-compose.yml` if desired, but it's harmless to leave it.

## General Troubleshooting Tips

### 1. Check Docker is Running
```powershell
docker ps
```

### 2. Check Disk Space
```powershell
docker system df
```

### 3. Clean Up Docker Resources
```powershell
# Remove unused containers, networks, images
.\build-docker.ps1 cleanall

# Or manually:
docker system prune -a -f
```

### 4. Check Docker Logs
```powershell
docker logs <container-id>
```

### 5. Verify Platform Compatibility
```powershell
# Check Docker platform
docker version

# Check if AMD-V/SVM is enabled (Windows)
systeminfo | findstr /C:"Hyper-V"
```

## Getting Help

If you continue to experience issues:

1. **Check the error message** - It usually contains helpful information
2. **Review this troubleshooting guide** - Common issues are documented here
3. **Check Docker Desktop logs** - Settings → Troubleshoot → View logs
4. **Try a fresh build** - Use `cleanall` then rebuild
5. **Check network connectivity** - Ensure you can reach apt.llvm.org

## Related Documentation

- [DOCKER.md](DOCKER.md) - Complete Docker documentation
- [DOCKER_FULL_LINUX_VM_WINDOWS.md](DOCKER_FULL_LINUX_VM_WINDOWS.md) - Windows-specific guide
- [DOCKER_QUICKSTART.md](DOCKER_QUICKSTART.md) - Quick start guide
- [CHECK_VIRTUALIZATION_WINDOWS.md](CHECK_VIRTUALIZATION_WINDOWS.md) - Check virtualization on Windows


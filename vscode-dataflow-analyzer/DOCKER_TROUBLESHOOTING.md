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

**Important**: After adding the repository URL to package.json, you must rebuild the Docker image:
```powershell
.\build-docker.ps1 build -NoCache
.\build-docker.ps1 package
```

## Issue 7: Test Command Fails - "tsc: not found"

### Symptoms
```
sh: 1: tsc: not found
Tests failed!
```

### Root Cause
When running tests, the `pretest` script runs `npm run compile` which requires TypeScript (`tsc`). The test command was mounting the entire workspace, which might override the container's `node_modules` that contains TypeScript.

### Solution
**Fixed in:** `build-docker.ps1` and `build-docker.sh`

Updated test command to:
- Run tests in container's `/app` directory (not mounted workspace)
- Mount only `src/` and `tests/` directories as read-only
- Use container's `node_modules` which includes devDependencies (TypeScript)

**Before:**
```powershell
docker run --rm -v "${PWD}:/workspace" -w /workspace $Tag npm test
```

**After:**
```powershell
docker run --rm `
    -v "${PWD}/src:/app/src:ro" `
    -v "${PWD}/tests:/app/tests:ro" `
    -w /app `
    $Tag `
    sh -c "npm test"
```

### Verification
Tests should now run successfully:
```powershell
.\build-docker.ps1 test
```

## Issue 8: Dev Container Missing Config Files - "Cannot find tsconfig.json"

### Symptoms
```
error TS5057: Cannot find a tsconfig.json file at the specified directory: './'.
ESLint couldn't find a configuration file.
```

### Root Cause
The dev container in `docker-compose.yml` was only mounting source directories (`src/`, `tests/`) but not the configuration files (`tsconfig.json`, `.eslintrc.json`, `jest.config.js`). When volumes are mounted, they override the files copied during the Docker build, so the config files were missing.

### Solution
**Fixed in:** `docker-compose.yml`

Added volume mounts for all required config files:
- `tsconfig.json` - TypeScript configuration
- `.eslintrc.json` - ESLint configuration
- `jest.config.js` - Jest test configuration
- `package.json` - Package manifest
- `package-lock.json` - Dependency lock file

**Before:**
```yaml
volumes:
  - ./src:/app/src:ro
  - ./tests:/app/tests:ro
```

**After:**
```yaml
volumes:
  - ./src:/app/src:ro
  - ./tests:/app/tests:ro
  - ./tsconfig.json:/app/tsconfig.json:ro
  - ./.eslintrc.json:/app/.eslintrc.json:ro
  - ./jest.config.js:/app/jest.config.js:ro
  - ./package.json:/app/package.json:ro
  - ./package-lock.json:/app/package-lock.json:ro
```

### Verification
After updating `docker-compose.yml`, restart the dev container:
```powershell
docker-compose down
.\build-docker.ps1 dev
docker-compose exec dev bash
# Inside container:
npm run compile  # Should work now
npm test         # Should work now
npm run lint     # Should work now
```

### Additional Improvements
**Enhanced logging in `docker-package.sh`:**
- Added verification that `package.json` exists
- Added check for repository field in `package.json`
- Added detailed error messages for packaging failures
- Better logging for debugging packaging issues

## Issue 9: Docker Platform Flag Warnings

### Symptoms
```
WARN: FromPlatformFlagConstDisallowed: FROM --platform flag should not use constant value "linux/amd64" (line 10)
WARN: FromPlatformFlagConstDisallowed: FROM --platform flag should not use constant value "linux/amd64" (line 174)
WARN: FromPlatformFlagConstDisallowed: FROM --platform flag should not use constant value "linux/amd64" (line 203)
```

### Root Cause
Docker Compose v2+ recommends using build arguments (`TARGETPLATFORM`) instead of hardcoded `--platform` flags in `FROM` statements. While the warnings don't break the build, they indicate a deprecated pattern.

### Solution
**Fixed in:** `Dockerfile`, `build-docker.ps1`, `build-docker.sh`

Updated Dockerfile to use build args:
- Added `ARG TARGETPLATFORM=linux/amd64` before each `FROM` statement
- Changed `FROM --platform=linux/amd64` to `FROM --platform=${TARGETPLATFORM}`
- Updated build scripts to pass `--build-arg TARGETPLATFORM=$platform`

**Before:**
```dockerfile
FROM --platform=linux/amd64 ubuntu:22.04 AS cpp-builder
```

**After:**
```dockerfile
ARG TARGETPLATFORM=linux/amd64
FROM --platform=${TARGETPLATFORM} ubuntu:22.04 AS cpp-builder
```

### Verification
The warnings should no longer appear:
```powershell
.\build-docker.ps1 build
```

**Note:** These warnings were harmless and didn't affect functionality. The fix makes the Dockerfile follow Docker best practices.

## Issue 10: TypeScript Version Warning in ESLint

### Symptoms
```
WARNING: You are currently running a version of TypeScript which is not officially supported by @typescript-eslint/typescript-estree.
SUPPORTED TYPESCRIPT VERSIONS: >=4.3.5 <5.4.0
YOUR TYPESCRIPT VERSION: 5.9.3
```

### Root Cause
The project uses TypeScript 5.9.3, but `@typescript-eslint/typescript-estree` officially supports up to TypeScript 5.4.0. This is a version mismatch warning.

### Validation
**This warning is acceptable and safe to ignore:**
- TypeScript 5.9.3 is backward compatible with TypeScript 5.4.0
- ESLint typically works fine with newer TypeScript versions
- The warning is informational, not an error
- No functionality is affected

### Solution
**No action required** - This is an informational warning. The code compiles and lints correctly.

If you want to eliminate the warning, you could downgrade TypeScript to 5.3.x, but this is not recommended as TypeScript 5.9.3 includes important bug fixes and improvements.

## Issue 11: ESLint Warnings (Not Errors)

### Symptoms
Many ESLint warnings about:
- Unused variables (`@typescript-eslint/no-unused-vars`)
- `any` types (`@typescript-eslint/no-explicit-any`)
- Unnecessary escape characters (`no-useless-escape`)
- Prefer const (`prefer-const`)

### Root Cause
These are code quality warnings, not errors. They indicate areas where code could be improved but don't prevent the code from working.

### Validation
**These warnings are acceptable:**
- The code compiles and runs successfully
- These are style/quality warnings, not functional errors
- The project has `--max-warnings 1000` in the lint script, allowing these warnings
- Fixing all warnings would require significant refactoring

### Solution
**No action required** - These are acceptable warnings. The code works correctly.

If you want to reduce warnings in the future:
1. Fix unused variables by removing them or prefixing with `_`
2. Replace `any` types with proper TypeScript types
3. Remove unnecessary escape characters in regex patterns
4. Use `const` instead of `let` for variables that aren't reassigned

## Issue 12: RedundantTargetPlatform Warning

### Symptoms
```
WARN: RedundantTargetPlatform: Setting platform to predefined ${TARGETPLATFORM} in FROM is redundant as this is the default behavior (line 13)
WARN: RedundantTargetPlatform: Setting platform to predefined ${TARGETPLATFORM} in FROM is redundant as this is the default behavior (line 179)
WARN: RedundantTargetPlatform: Setting platform to predefined ${TARGETPLATFORM} in FROM is redundant as this is the default behavior (line 210)
```

### Root Cause
When using `--platform` flag in `docker build`, Docker automatically sets the `TARGETPLATFORM` build arg. Using `FROM --platform=${TARGETPLATFORM}` is redundant because Docker already handles platform selection based on the `--platform` flag.

### Solution
**Fixed in:** `Dockerfile`, `build-docker.ps1`, `build-docker.sh`

Removed redundant `--platform=${TARGETPLATFORM}` from FROM statements:
- Changed `FROM --platform=${TARGETPLATFORM} ubuntu:22.04` to `FROM ubuntu:22.04`
- Changed `FROM --platform=${TARGETPLATFORM} node:20-slim` to `FROM node:20-slim`
- Removed `--build-arg TARGETPLATFORM=$platform` from build scripts (Docker sets it automatically)

**Before:**
```dockerfile
ARG TARGETPLATFORM=linux/amd64
FROM --platform=${TARGETPLATFORM} ubuntu:22.04 AS cpp-builder
```

**After:**
```dockerfile
# Docker automatically sets TARGETPLATFORM when --platform is used
FROM ubuntu:22.04 AS cpp-builder
```

### Verification
The warnings should no longer appear:
```powershell
.\build-docker.ps1 build
```

**Note:** The `--platform` flag in the build command is still required and works correctly. Docker handles platform selection automatically.

## Issue 13: TypeScript Compilation Errors in Dev Container - "ENOENT: no such file or directory, mkdir"

### Symptoms
```
error TS5033: Could not write file '/app/out/__mocks__/vscode.js': ENOENT: no such file or directory, mkdir '/app/out/__mocks__'.
error TS5033: Could not write file '/app/out/analyzer/CPPParser.js': ENOENT: no such file or directory, mkdir '/app/out/analyzer'.
```

### Root Cause
When `./out` directory is mounted from the host to `/app/out` in the container, if the directory doesn't exist on the host or has incorrect permissions, TypeScript cannot create subdirectories inside it. Docker creates the mount point but may not have proper permissions for the container user.

### Solution
**Fixed in:** `docker-compose.yml`

Updated the dev service to ensure the out directory exists and has proper permissions:

```yaml
dev:
  entrypoint: ["/bin/bash", "-c"]
  command:
    - |
      echo "Setting up development environment..."
      mkdir -p /app/out
      chmod -R 777 /app/out || true
      echo "Development environment ready!"
      tail -f /dev/null
```

This ensures:
1. The `/app/out` directory exists before TypeScript tries to write to it
2. Proper permissions are set so TypeScript can create subdirectories
3. The container continues running after setup

### Alternative Solutions
If the issue persists, you can also:

1. **Create the directory on the host first:**
   ```powershell
   mkdir -p out
   ```

2. **Or use a named volume instead of bind mount:**
   ```yaml
   volumes:
     - out-data:/app/out
   volumes:
     out-data:
   ```

### Verification
After starting the dev container:
```powershell
docker-compose up -d dev
docker-compose exec dev npm run compile
```

The compilation should succeed without ENOENT errors.

## Issue 14: Docker Compose Version Warning

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


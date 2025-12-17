# PowerShell script to build and run VS Code Dataflow Analyzer in Docker
# Usage: .\build-docker.ps1 [command] [options]
# All output is logged to logs2.txt

param(
    [Parameter(Position=0)]
    [ValidateSet("build", "run", "dev", "package", "test", "clean", "cleanall", "help")]
    [string]$Command = "help",
    
    [switch]$Windows,
    [switch]$NoCache,
    [string]$Tag = "vscode-dataflow-analyzer:latest"
)

$ErrorActionPreference = "Stop"

# Log file path
$LogFile = "logs2.txt"

# Function to write to both console and log file
function Write-Log {
    param(
        [string]$Message,
        [string]$ForegroundColor = "White"
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $Message"
    Write-Host $Message -ForegroundColor $ForegroundColor
    Add-Content -Path $LogFile -Value $logMessage -ErrorAction SilentlyContinue
}

# Function to execute command and log output
function Invoke-LoggedCommand {
    param(
        [string]$Command,
        [string[]]$Arguments = @(),
        [switch]$NoOutput,
        [switch]$CaptureOutput
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $fullCommand = if ($Arguments.Count -gt 0) { "$Command $($Arguments -join ' ')" } else { $Command }
    Add-Content -Path $LogFile -Value "[$timestamp] Executing: $fullCommand" -ErrorAction SilentlyContinue
    Write-Log "[DEBUG] Full command: $fullCommand" -ForegroundColor DarkGray
    
    # Capture output to variable for detailed error reporting
    $output = @()
    $errorOutput = @()
    $exitCode = 0
    
    try {
        if ($CaptureOutput) {
            # Capture all output for detailed error analysis while showing it in real-time
            $output = @()
            $errorOutput = @()
            
            # Build the full command string for logging
            $commandString = if ($Arguments.Count -gt 0) {
                "$Command $($Arguments -join ' ')"
            } else {
                $Command
            }
            Write-Log "[DEBUG] Executing command: $commandString" -ForegroundColor DarkGray
            
            # Use Start-Process with proper argument handling
            # Arguments must be a single string, properly escaped
            $argumentsString = $Arguments -join ' '
            Write-Log "[DEBUG] Arguments string: $argumentsString" -ForegroundColor DarkGray
            Write-Log "[DEBUG] Arguments count: $($Arguments.Count)" -ForegroundColor DarkGray
            Write-Log "[DEBUG] First argument: $($Arguments[0])" -ForegroundColor DarkGray
            
            # Use temporary files for output capture
            $stdoutFile = "$env:TEMP\docker_stdout_$(Get-Date -Format 'yyyyMMddHHmmss').txt"
            $stderrFile = "$env:TEMP\docker_stderr_$(Get-Date -Format 'yyyyMMddHHmmss').txt"
            
            try {
                # Execute using Start-Process with proper redirection
                $process = Start-Process -FilePath $Command -ArgumentList $Arguments -NoNewWindow -PassThru -Wait -RedirectStandardOutput $stdoutFile -RedirectStandardError $stderrFile
                $exitCode = $process.ExitCode
                
                # Read captured output
                if (Test-Path $stdoutFile) {
                    $output = Get-Content $stdoutFile -ErrorAction SilentlyContinue
                    $output | ForEach-Object { 
                        Add-Content -Path $LogFile -Value $_ -ErrorAction SilentlyContinue
                        Write-Host $_
                    }
                }
                
                if (Test-Path $stderrFile) {
                    $errorOutput = Get-Content $stderrFile -ErrorAction SilentlyContinue
                    $errorOutput | ForEach-Object { 
                        Add-Content -Path $LogFile -Value "STDERR: $_" -ErrorAction SilentlyContinue
                        Write-Host $_ -ForegroundColor Yellow
                    }
                }
                
                return @{ ExitCode = $exitCode; Output = $output; ErrorOutput = $errorOutput }
            } finally {
                # Cleanup temp files
                Remove-Item $stdoutFile -ErrorAction SilentlyContinue
                Remove-Item $stderrFile -ErrorAction SilentlyContinue
            }
        } elseif ($NoOutput) {
            # Suppress output but still log errors
            $result = & $Command @Arguments 2>&1 | Tee-Object -FilePath $LogFile -Append
            return $result
        } else {
            # Show output and log everything - use direct invocation for better compatibility
            $fullCmd = "$Command $($Arguments -join ' ')"
            Write-Log "[DEBUG] Direct execution: $fullCmd" -ForegroundColor DarkGray
            
            # Try direct execution first
            try {
                & $Command @Arguments 2>&1 | Tee-Object -FilePath $LogFile -Append
                return $LASTEXITCODE
            } catch {
                # Fallback: try with explicit command construction
                Write-Log "[DEBUG] Direct execution failed, trying alternative method" -ForegroundColor Yellow
                $process = Start-Process -FilePath $Command -ArgumentList $Arguments -NoNewWindow -Wait -PassThru -RedirectStandardOutput "$env:TEMP\docker_output.txt" -RedirectStandardError "$env:TEMP\docker_error.txt"
                
                if (Test-Path "$env:TEMP\docker_output.txt") {
                    Get-Content "$env:TEMP\docker_output.txt" | Tee-Object -FilePath $LogFile -Append | Write-Host
                }
                if (Test-Path "$env:TEMP\docker_error.txt") {
                    Get-Content "$env:TEMP\docker_error.txt" | ForEach-Object { 
                        Add-Content -Path $LogFile -Value "STDERR: $_" -ErrorAction SilentlyContinue
                        Write-Host $_ -ForegroundColor Yellow
                    }
                }
                
                Remove-Item "$env:TEMP\docker_output.txt" -ErrorAction SilentlyContinue
                Remove-Item "$env:TEMP\docker_error.txt" -ErrorAction SilentlyContinue
                
                return $process.ExitCode
            }
        }
    } catch {
        $errorMsg = "[$timestamp] ERROR executing $fullCommand : $($_.Exception.Message)"
        $errorDetails = $_.Exception | Format-List -Force | Out-String
        Write-Log $errorMsg -ForegroundColor Red
        Write-Log "Exception details: $errorDetails" -ForegroundColor Red
        Add-Content -Path $LogFile -Value $errorMsg -ErrorAction SilentlyContinue
        Add-Content -Path $LogFile -Value "Exception details: $errorDetails" -ErrorAction SilentlyContinue
        return 1
    }
}

# Initialize log file
$null = New-Item -ItemType File -Path $LogFile -Force -ErrorAction SilentlyContinue
Write-Log "=== Starting Docker Build Script ===" -ForegroundColor Cyan
Write-Log "Command: $Command" -ForegroundColor Gray
Write-Log "Tag: $Tag" -ForegroundColor Gray
Write-Log "Windows: $Windows" -ForegroundColor Gray
Write-Log "NoCache: $NoCache" -ForegroundColor Gray

function Show-Help {
    Write-Host @"
VS Code Dataflow Analyzer - Docker Build Script

Usage: .\build-docker.ps1 [command] [options]

Commands:
  build      Build the Docker image (default: Linux container)
  run        Run a container interactively
  dev        Start development container with volume mounts
  package    Build and package extension as .vsix file
  test       Run tests in Docker container
  clean      Remove Docker images and containers
  cleanall   Complete cleanup: containers, images, and build cache
  help       Show this help message

Options:
  -Windows   Use Windows container (requires Windows containers enabled)
  -NoCache   Build without using cache
  -Tag       Docker image tag (default: vscode-dataflow-analyzer:latest)

Examples:
  .\build-docker.ps1 build
  .\build-docker.ps1 build -Windows
  .\build-docker.ps1 build -NoCache
  .\build-docker.ps1 dev
  .\build-docker.ps1 package
  .\build-docker.ps1 package -NoCache
  .\build-docker.ps1 clean
"@
}

function Build-Image {
    param([bool]$UseWindows)
    
    $dockerfile = if ($UseWindows) { "Dockerfile.windows" } else { "Dockerfile" }
    $platform = if ($UseWindows) { "windows/amd64" } else { "linux/amd64" }
    $platformName = if ($UseWindows) { "Windows AMD x64" } else { "Linux AMD x64" }
    
    Write-Log "Building Docker image for $platformName platform..." -ForegroundColor Cyan
    Write-Log "Using Dockerfile: $dockerfile" -ForegroundColor Gray
    Write-Log "Platform: $platform (compatible with AMD x64 and Intel x64)" -ForegroundColor Gray
    
    # Pre-build checks
    Write-Log "[DEBUG] Pre-build validation..." -ForegroundColor DarkGray
    if (-not (Test-Path $dockerfile)) {
        Write-Log "ERROR: Dockerfile not found: $dockerfile" -ForegroundColor Red
        Write-Log "Current directory: $(Get-Location)" -ForegroundColor Yellow
        Write-Log "Files in current directory:" -ForegroundColor Yellow
        Get-ChildItem -File | Select-Object -First 10 Name | ForEach-Object { Write-Log "  - $($_.Name)" -ForegroundColor Gray }
        exit 1
    }
    Write-Log "[DEBUG] Dockerfile exists: $dockerfile" -ForegroundColor DarkGray
    
    # Check Docker daemon
    Write-Log "[DEBUG] Checking Docker daemon..." -ForegroundColor DarkGray
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Log "ERROR: Docker daemon is not running or not accessible" -ForegroundColor Red
        Write-Log "Docker info output: $dockerInfo" -ForegroundColor Yellow
        exit 1
    }
    Write-Log "[DEBUG] Docker daemon is accessible" -ForegroundColor DarkGray
    
    # Check Docker version
    Write-Log "[DEBUG] Docker version:" -ForegroundColor DarkGray
    docker version --format '{{.Server.Version}}' | ForEach-Object { Write-Log "  Server: $_" -ForegroundColor Gray }
    docker version --format '{{.Client.Version}}' | ForEach-Object { Write-Log "  Client: $_" -ForegroundColor Gray }
    
    # Check available disk space
    Write-Log "[DEBUG] Checking disk space..." -ForegroundColor DarkGray
    $diskSpace = Get-PSDrive C | Select-Object Used, Free
    Write-Log "  Available: $([math]::Round($diskSpace.Free / 1GB, 2)) GB" -ForegroundColor Gray
    
    # Note: When using --platform flag, Docker automatically sets TARGETPLATFORM build arg
    # We don't need to pass it explicitly, and we don't need it in FROM statements
    $buildArgs = @(
        "build",
        "--platform", $platform,
        "-t", $Tag,
        "-f", $dockerfile,
        "--progress", "plain"  # Use plain progress for better logging
    )
    
    if ($NoCache) {
        $buildArgs += "--no-cache"
        Write-Log "[DEBUG] Building without cache" -ForegroundColor DarkGray
    }
    
    $buildArgs += "."
    
    Write-Log "Running: docker $($buildArgs -join ' ')" -ForegroundColor Gray
    Write-Log "[DEBUG] Build context: $(Get-Location)" -ForegroundColor DarkGray
    Write-Log "[DEBUG] Build started at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor DarkGray
    Write-Log "[DEBUG] Build arguments count: $($buildArgs.Count)" -ForegroundColor DarkGray
    # Build arguments string for logging (compatible with PowerShell 5.1)
    $argsString = ($buildArgs | ForEach-Object { "'$_'" }) -join ', '
    Write-Log "[DEBUG] Build arguments: $argsString" -ForegroundColor DarkGray
    
    # Test docker command first
    Write-Log "[DEBUG] Testing docker command..." -ForegroundColor DarkGray
    $testResult = docker --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Log "ERROR: Docker command test failed: $testResult" -ForegroundColor Red
        exit 1
    }
    Write-Log "[DEBUG] Docker command test passed: $testResult" -ForegroundColor DarkGray
    
    # Capture output for detailed error analysis
    $result = Invoke-LoggedCommand -Command "docker" -Arguments $buildArgs -CaptureOutput
    
    if ($result.ExitCode -ne 0) {
        Write-Log "`n=== BUILD FAILED ===" -ForegroundColor Red
        Write-Log "Exit Code: $($result.ExitCode)" -ForegroundColor Red
        
        # Show last 50 lines of output for context
        Write-Log "`n=== Last 50 lines of build output ===" -ForegroundColor Yellow
        $lastLines = $result.Output | Select-Object -Last 50
        $lastLines | ForEach-Object { Write-Log $_ -ForegroundColor Gray }
        
        # Show error output
        if ($result.ErrorOutput -and $result.ErrorOutput.Count -gt 0) {
            Write-Log "`n=== Error output ===" -ForegroundColor Red
            $result.ErrorOutput | ForEach-Object { Write-Log $_ -ForegroundColor Red }
        }
        
        # Show last 20 lines from log file
        Write-Log "`n=== Last 20 lines from log file ===" -ForegroundColor Yellow
        if (Test-Path $LogFile) {
            Get-Content $LogFile -Tail 20 | ForEach-Object { Write-Log $_ -ForegroundColor Gray }
        }
        
        # Common issues and suggestions
        Write-Log "`n=== Troubleshooting suggestions ===" -ForegroundColor Cyan
        Write-Log "1. Check Docker daemon is running: docker info" -ForegroundColor Gray
        Write-Log "2. Check disk space: docker system df" -ForegroundColor Gray
        Write-Log "3. Check Dockerfile syntax: docker build --dry-run ..." -ForegroundColor Gray
        Write-Log "4. Check network connectivity (for apt/package downloads)" -ForegroundColor Gray
        Write-Log "5. Review full log: Get-Content $LogFile -Tail 100" -ForegroundColor Gray
        Write-Log "6. Try cleaning Docker: .\build-docker.ps1 cleanall" -ForegroundColor Gray
        
        Write-Log "`nFull build output has been logged to: $LogFile" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Log "[DEBUG] Build completed at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor DarkGray
    Write-Log "Build completed successfully!" -ForegroundColor Green
    
    # Verify image was created
    Write-Log "[DEBUG] Verifying image creation..." -ForegroundColor DarkGray
    $imageExists = docker images $Tag --format "{{.Repository}}:{{.Tag}}" 2>&1
    if ($imageExists -and $imageExists -like "*$Tag*") {
        Write-Log "Image verified: $Tag" -ForegroundColor Green
        docker images $Tag --format "  Size: {{.Size}}, Created: {{.CreatedAt}}" | ForEach-Object { Write-Log $_ -ForegroundColor Gray }
    } else {
        Write-Log "WARNING: Image verification failed. Image may not have been created." -ForegroundColor Yellow
    }
}

function Run-Container {
    Write-Log "Running container interactively..." -ForegroundColor Cyan
    
    $runArgs = @(
        "run", "-it", "--rm",
        "-v", "${PWD}/src:/app/src",
        "-v", "${PWD}/out:/app/out",
        "-v", "${PWD}/tests:/app/tests",
        "-w", "/app",
        $Tag,
        "bash"
    )
    Invoke-LoggedCommand -Command "docker" -Arguments $runArgs
}

function Start-DevContainer {
    Write-Log "Starting development container..." -ForegroundColor Cyan
    
    $exitCode = Invoke-LoggedCommand -Command "docker-compose" -Arguments @("up", "-d", "dev")
    
    if ($exitCode -eq 0) {
        Write-Log "Development container started!" -ForegroundColor Green
        Write-Log "To execute commands:" -ForegroundColor Yellow
        Write-Log "  docker-compose exec dev npm run compile" -ForegroundColor Gray
        Write-Log "  docker-compose exec dev npm test" -ForegroundColor Gray
        Write-Log "  docker-compose exec dev bash" -ForegroundColor Gray
    } else {
        Write-Log "Failed to start development container!" -ForegroundColor Red
        exit 1
    }
}

function Package-Extension {
    Write-Log "Packaging extension as .vsix..." -ForegroundColor Cyan
    
    # Ensure dist directory exists
    if (-not (Test-Path "dist")) {
        New-Item -ItemType Directory -Path "dist" | Out-Null
        Write-Log "Created dist directory" -ForegroundColor Gray
    }
    
    # Copy helper script to container and use it
    # The helper script temporarily disables vscode:prepublish since code is already compiled
    # Using @vscode/vsce (newer maintained version) instead of deprecated vsce
    # Note: Script is mounted read-only, so we run it directly with bash instead of chmod
    $packageArgs = @(
        "run", "--rm",
        "-v", "${PWD}/dist:/app/dist",
        "-v", "${PWD}/docker-package.sh:/tmp/docker-package.sh:ro",
        "-w", "/app",
        $Tag,
        "bash", "/tmp/docker-package.sh"
    )
    $exitCode = Invoke-LoggedCommand -Command "docker" -Arguments $packageArgs
    
    if ($exitCode -eq 0) {
        Write-Log "Extension packaged successfully!" -ForegroundColor Green
        Write-Log "VSIX file: dist/dataflow-analyzer.vsix" -ForegroundColor Yellow
    } else {
        Write-Log "Packaging failed!" -ForegroundColor Red
        exit 1
    }
}

function Run-Tests {
    Write-Log "Running tests in Docker container..." -ForegroundColor Cyan
    
    # Run tests in the container's /app directory (not mounted workspace)
    # This ensures node_modules and devDependencies are available
    $testArgs = @(
        "run", "--rm",
        "-v", "${PWD}/src:/app/src:ro",
        "-v", "${PWD}/tests:/app/tests:ro",
        "-w", "/app",
        $Tag,
        "sh", "-c", "npm test"
    )
    $exitCode = Invoke-LoggedCommand -Command "docker" -Arguments $testArgs
    
    if ($exitCode -ne 0) {
        Write-Log "Tests failed!" -ForegroundColor Red
        exit 1
    }
}

function Clean-Docker {
    Write-Log "Cleaning Docker resources..." -ForegroundColor Cyan
    
    # Stop and remove containers
    Write-Log "Stopping containers..." -ForegroundColor Yellow
    Invoke-LoggedCommand -Command "docker-compose" -Arguments @("down") -NoOutput
    
    # Remove images
    Write-Log "Removing images..." -ForegroundColor Yellow
    Invoke-LoggedCommand -Command "docker" -Arguments @("rmi", $Tag) -NoOutput
    Invoke-LoggedCommand -Command "docker" -Arguments @("rmi", "vscode-dataflow-analyzer") -NoOutput
    
    # Remove dangling images
    Write-Log "Pruning images..." -ForegroundColor Yellow
    Invoke-LoggedCommand -Command "docker" -Arguments @("image", "prune", "-f")
    
    Write-Log "Cleanup completed!" -ForegroundColor Green
}

function Clean-All {
    Write-Log "Performing complete Docker cleanup..." -ForegroundColor Cyan
    
    # Stop containers
    Write-Log "Stopping containers..." -ForegroundColor Yellow
    Invoke-LoggedCommand -Command "docker-compose" -Arguments @("down") -NoOutput
    
    # Remove containers
    Write-Log "Removing containers..." -ForegroundColor Yellow
    Invoke-LoggedCommand -Command "docker" -Arguments @("container", "prune", "-f")
    
    # Remove images
    Write-Log "Removing images..." -ForegroundColor Yellow
    Invoke-LoggedCommand -Command "docker" -Arguments @("rmi", $Tag) -NoOutput
    Invoke-LoggedCommand -Command "docker" -Arguments @("rmi", "vscode-dataflow-analyzer") -NoOutput
    Invoke-LoggedCommand -Command "docker" -Arguments @("image", "prune", "-a", "-f")
    
    # Clear build cache
    Write-Log "Clearing build cache..." -ForegroundColor Yellow
    Invoke-LoggedCommand -Command "docker" -Arguments @("builder", "prune", "-a", "-f")
    
    Write-Log "Complete cleanup finished!" -ForegroundColor Green
    Write-Log "Run '.\build-docker.ps1 build -NoCache' for fresh build" -ForegroundColor Yellow
}

# Main execution
try {
    switch ($Command) {
        "build" {
            Build-Image -UseWindows:$Windows
        }
        "run" {
            Build-Image -UseWindows:$Windows
            Run-Container
        }
        "dev" {
            Build-Image -UseWindows:$Windows
            Start-DevContainer
        }
        "package" {
            Build-Image -UseWindows:$Windows
            Package-Extension
        }
        "test" {
            Build-Image -UseWindows:$Windows
            Run-Tests
        }
        "clean" {
            Clean-Docker
        }
        "cleanall" {
            Clean-All
        }
        "help" {
            Show-Help | Tee-Object -FilePath $LogFile -Append
        }
        default {
            Show-Help | Tee-Object -FilePath $LogFile -Append
        }
    }
    Write-Log "=== Script completed successfully ===" -ForegroundColor Green
} catch {
    Write-Log "=== Script failed with error ===" -ForegroundColor Red
    Write-Log $_.Exception.Message -ForegroundColor Red
    Write-Log $_.ScriptStackTrace -ForegroundColor Red
    Add-Content -Path $LogFile -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ERROR: $($_.Exception.Message)" -ErrorAction SilentlyContinue
    Add-Content -Path $LogFile -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] STACKTRACE: $($_.ScriptStackTrace)" -ErrorAction SilentlyContinue
    exit 1
}


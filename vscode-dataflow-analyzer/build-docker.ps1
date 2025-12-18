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
            # Start-Process accepts an array of arguments and handles quoting correctly
            # However, we need to ensure paths with spaces are properly quoted in the array
            $argumentsString = $Arguments -join ' '
            Write-Log "[DEBUG] Arguments string: $argumentsString" -ForegroundColor DarkGray
            Write-Log "[DEBUG] Arguments count: $($Arguments.Count)" -ForegroundColor DarkGray
            Write-Log "[DEBUG] First argument: $($Arguments[0])" -ForegroundColor DarkGray
            # Show all arguments for debugging (use -join for PowerShell 5.1 compatibility)
            $argsDebug = $Arguments | ForEach-Object { "'$_'" } | ForEach-Object { $_ }
            Write-Log "[DEBUG] All arguments: $($argsDebug -join ', ')" -ForegroundColor DarkGray
            
            # Use temporary files for output capture
            $stdoutFile = "$env:TEMP\docker_stdout_$(Get-Date -Format 'yyyyMMddHHmmss').txt"
            $stderrFile = "$env:TEMP\docker_stderr_$(Get-Date -Format 'yyyyMMddHHmmss').txt"
            
            try {
                # Execute using Start-Process with proper redirection
                # CRITICAL: Start-Process with ArgumentList passes each array element as a separate argument
                # When paths contain spaces, Docker sees them as separate arguments (e.g., "sem" and "7/Program")
                # Solution: Build a single quoted argument string for paths with spaces
                # For Docker volume mounts with spaces, we need to quote the entire "host_path:container_path" value
                $quotedArguments = @()
                $i = 0
                while ($i -lt $Arguments.Count) {
                    $arg = $Arguments[$i]
                    # Check if this is a volume mount argument (-v) and the next argument contains spaces
                    if ($arg -eq "-v" -and $i + 1 -lt $Arguments.Count) {
                        $volumeArg = $Arguments[$i + 1]
                        if ($volumeArg -match ' ') {
                            # Quote the entire volume mount specification
                            $quotedArguments += $arg
                            $quotedArguments += "`"$volumeArg`""
                            $i += 2
                        } else {
                            $quotedArguments += $arg
                            $i++
                        }
                    } else {
                        $quotedArguments += $arg
                        $i++
                    }
                }
                
                Write-Log "[DEBUG] Using quoted arguments for volume mounts with spaces" -ForegroundColor DarkGray
                $process = Start-Process -FilePath $Command -ArgumentList $quotedArguments -NoNewWindow -PassThru -Wait -RedirectStandardOutput $stdoutFile -RedirectStandardError $stderrFile
                $exitCode = $process.ExitCode
                
                Write-Log "[DEBUG] Process exit code: $exitCode" -ForegroundColor DarkGray
                
                # Read captured output
                if (Test-Path $stdoutFile) {
                    $outputRaw = Get-Content $stdoutFile -ErrorAction SilentlyContinue -Raw
                    if ($outputRaw -and $outputRaw.Trim().Length -gt 0) {
                        $outputRaw -split "`n" | ForEach-Object { 
                            if ($_.Trim().Length -gt 0) {
                                Add-Content -Path $LogFile -Value $_ -ErrorAction SilentlyContinue
                                Write-Host $_
                            }
                        }
                        $output = $outputRaw -split "`n" | Where-Object { $_.Trim().Length -gt 0 }
                    } else {
                        $output = @()
                    }
                } else {
                    $output = @()
                }
                
                if (Test-Path $stderrFile) {
                    $errorOutput = Get-Content $stderrFile -ErrorAction SilentlyContinue -Raw
                    # Check if stderr contains actual errors or just informational output
                    # docker-compose writes normal output to stderr, so we need to distinguish
                    if ($errorOutput -and $errorOutput.Trim().Length -gt 0) {
                        # For docker-compose, normal operations write to stderr but aren't errors
                        # Only log as error if exit code is non-zero
                        if ($exitCode -ne 0) {
                            $errorOutput -split "`n" | ForEach-Object { 
                                if ($_.Trim().Length -gt 0) {
                                    Add-Content -Path $LogFile -Value "STDERR: $_" -ErrorAction SilentlyContinue
                                    Write-Host $_ -ForegroundColor Yellow
                                }
                            }
                        } else {
                            # For successful docker-compose commands, stderr is just informational
                            $errorOutput -split "`n" | ForEach-Object { 
                                if ($_.Trim().Length -gt 0) {
                                    Add-Content -Path $LogFile -Value $_ -ErrorAction SilentlyContinue
                                    Write-Host $_ -ForegroundColor Gray
                                }
                            }
                        }
                    }
                    # Convert to array for return value
                    $errorOutputArray = if ($errorOutput) { $errorOutput -split "`n" | Where-Object { $_.Trim().Length -gt 0 } } else { @() }
                } else {
                    $errorOutputArray = @()
                }
                
                return @{ ExitCode = $exitCode; Output = $output; ErrorOutput = $errorOutputArray }
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
                Write-Log "[DEBUG] Exception: $($_.Exception.Message)" -ForegroundColor DarkGray
                
                # Handle volume mount arguments with spaces (same logic as CaptureOutput path)
                $quotedArguments = @()
                $i = 0
                while ($i -lt $Arguments.Count) {
                    $arg = $Arguments[$i]
                    if ($arg -eq "-v" -and $i + 1 -lt $Arguments.Count) {
                        $volumeArg = $Arguments[$i + 1]
                        if ($volumeArg -match ' ') {
                            $quotedArguments += $arg
                            $quotedArguments += "`"$volumeArg`""
                            $i += 2
                        } else {
                            $quotedArguments += $arg
                            $i++
                        }
                    } else {
                        $quotedArguments += $arg
                        $i++
                    }
                }
                
                $stdoutFile = "$env:TEMP\docker_output_$(Get-Date -Format 'yyyyMMddHHmmss').txt"
                $stderrFile = "$env:TEMP\docker_error_$(Get-Date -Format 'yyyyMMddHHmmss').txt"
                
                $process = Start-Process -FilePath $Command -ArgumentList $quotedArguments -NoNewWindow -Wait -PassThru -RedirectStandardOutput $stdoutFile -RedirectStandardError $stderrFile
                $exitCode = $process.ExitCode
                
                Write-Log "[DEBUG] Alternative method exit code: $exitCode" -ForegroundColor DarkGray
                
                if (Test-Path $stdoutFile) {
                    $stdoutContent = Get-Content $stdoutFile -ErrorAction SilentlyContinue -Raw
                    if ($stdoutContent -and $stdoutContent.Trim().Length -gt 0) {
                        $stdoutContent -split "`n" | ForEach-Object {
                            if ($_.Trim().Length -gt 0) {
                                Add-Content -Path $LogFile -Value $_ -ErrorAction SilentlyContinue
                                Write-Host $_
                            }
                        }
                    }
                }
                
                if (Test-Path $stderrFile) {
                    $stderrContent = Get-Content $stderrFile -ErrorAction SilentlyContinue -Raw
                    if ($stderrContent -and $stderrContent.Trim().Length -gt 0) {
                        # For docker-compose, stderr is informational when exit code is 0
                        $stderrContent -split "`n" | ForEach-Object {
                            if ($_.Trim().Length -gt 0) {
                                if ($exitCode -ne 0) {
                                    Add-Content -Path $LogFile -Value "STDERR: $_" -ErrorAction SilentlyContinue
                                    Write-Host $_ -ForegroundColor Yellow
                                } else {
                                    Add-Content -Path $LogFile -Value $_ -ErrorAction SilentlyContinue
                                    Write-Host $_ -ForegroundColor Gray
                                }
                            }
                        }
                    }
                }
                
                Remove-Item $stdoutFile -ErrorAction SilentlyContinue
                Remove-Item $stderrFile -ErrorAction SilentlyContinue
                
                return $exitCode
            }
        }
    } catch {
        # Safely escape strings to avoid quote issues
        $exceptionMsg = $_.Exception.Message -replace '"', '""'
        $errorMsg = "[$timestamp] ERROR executing $fullCommand : $exceptionMsg"
        $errorDetails = $_.Exception | Format-List -Force | Out-String
        $errorDetailsEscaped = $errorDetails -replace '"', '""'
        Write-Log $errorMsg -ForegroundColor Red
        Write-Log "Exception details: $errorDetails" -ForegroundColor Red
        Add-Content -Path $LogFile -Value $errorMsg -ErrorAction SilentlyContinue
        Add-Content -Path $LogFile -Value "Exception details: $errorDetailsEscaped" -ErrorAction SilentlyContinue
        
        # Return consistent structure: hash table if CaptureOutput was requested, integer otherwise
        if ($CaptureOutput) {
            return @{ ExitCode = 1; Output = @(); ErrorOutput = @($errorMsg, $errorDetails) }
        } else {
            return 1
        }
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
    
    # Convert Windows paths to forward slashes for Docker
    $srcPath = (Resolve-Path "src").Path -replace '\\', '/'
    $outPath = (Resolve-Path "out").Path -replace '\\', '/'
    $testsPath = (Resolve-Path "tests").Path -replace '\\', '/'
    
    Write-Log "[DEBUG] Source path: $srcPath" -ForegroundColor DarkGray
    Write-Log "[DEBUG] Output path: $outPath" -ForegroundColor DarkGray
    Write-Log "[DEBUG] Tests path: $testsPath" -ForegroundColor DarkGray
    
    $runArgs = @(
        "run", "-it", "--rm",
        "-v", "${srcPath}:/app/src",
        "-v", "${outPath}:/app/out",
        "-v", "${testsPath}:/app/tests",
        "-w", "/app",
        $Tag,
        "bash"
    )
    
    Write-Log "Executing: docker $($runArgs -join ' ')" -ForegroundColor Cyan
    Write-Log "[DEBUG] Interactive command detected (-it flag). Executing without output redirection..." -ForegroundColor DarkGray
    
    # For interactive commands (-it), we cannot use Invoke-LoggedCommand with output redirection
    # as it will hang waiting for interactive input. Execute directly instead.
    try {
        # Execute docker run -it directly without output redirection
        # This allows the interactive terminal to work properly
        & docker @runArgs
        $exitCode = $LASTEXITCODE
        Write-Log "[DEBUG] Container exited with code: $exitCode" -ForegroundColor DarkGray
        
        # Log the command execution (but not the interactive output)
        # Escape any quotes in the command string to avoid parsing issues
        $commandStr = ($runArgs -join ' ') -replace '"', '""'
        $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        $logEntry = "[$timestamp] Executed interactive docker command: docker $commandStr`n"
        $logEntry += "[$timestamp] Container exited with code: $exitCode`n"
        Add-Content -Path $LogFile -Value $logEntry
        
        if ($exitCode -ne 0) {
            Write-Log "Container exited with non-zero code: $exitCode" -ForegroundColor Yellow
        }
    } catch {
        # Safely escape exception message to avoid quote issues
        $exceptionMsg = $_.Exception.Message -replace '"', '""'
        Write-Log "ERROR: Failed to run container interactively: $exceptionMsg" -ForegroundColor Red
        $exceptionDetails = $_.Exception | Format-List -Force | Out-String
        Write-Log "Exception details: $exceptionDetails" -ForegroundColor DarkGray
        $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        $logEntry = "[$timestamp] ERROR: Failed to run container: $exceptionMsg`n"
        Add-Content -Path $LogFile -Value $logEntry
        exit 1
    }
}

function Start-DevContainer {
    Write-Log "Starting development container..." -ForegroundColor Cyan
    
    # Use CaptureOutput to properly handle docker-compose output and get exit code
    # docker-compose writes normal output to STDERR, so we need to check exit code, not just STDERR
    try {
        $result = Invoke-LoggedCommand -Command "docker-compose" -Arguments @("up", "-d", "dev") -CaptureOutput
        
        # Validate result structure
        if (-not $result) {
            Write-Log "ERROR: Invoke-LoggedCommand returned null or empty result" -ForegroundColor Red
            exit 1
        }
        
        # Check if ExitCode exists - for hashtables use .ContainsKey, for objects use Properties
        $hasExitCode = if ($result -is [hashtable]) {
            $result.ContainsKey("ExitCode")
        } else {
            $result.PSObject.Properties.Name -contains "ExitCode"
        }
        
        if (-not $hasExitCode) {
            Write-Log "ERROR: Result object missing ExitCode property. Result type: $($result.GetType().FullName)" -ForegroundColor Red
            if ($result -is [hashtable]) {
                Write-Log "Hashtable keys: $($result.Keys -join ', ')" -ForegroundColor Yellow
            } else {
                Write-Log "Result properties: $($result.PSObject.Properties.Name -join ', ')" -ForegroundColor Yellow
            }
            Write-Log "Result content: $($result | ConvertTo-Json -Depth 3)" -ForegroundColor Yellow
            exit 1
        }
        
        $exitCode = $result.ExitCode
        
        Write-Log "[DEBUG] docker-compose exit code: $exitCode" -ForegroundColor DarkGray
        Write-Log "[DEBUG] Result type: $($result.GetType().FullName)" -ForegroundColor DarkGray
        
        # Show custom properties (for hashtables, use .Keys; for PSCustomObject, use Properties)
        if ($result -is [hashtable]) {
            Write-Log "[DEBUG] Result keys: $($result.Keys -join ', ')" -ForegroundColor DarkGray
            Write-Log "[DEBUG] ExitCode value: $($result.ExitCode)" -ForegroundColor DarkGray
            
            # For docker-compose, output often goes to ErrorOutput (stderr) not Output (stdout)
            $outputCount = if ($result.Output) { $result.Output.Count } else { 0 }
            $errorOutputCount = if ($result.ErrorOutput) { $result.ErrorOutput.Count } else { 0 }
            Write-Log "[DEBUG] Output lines: $outputCount, ErrorOutput lines: $errorOutputCount" -ForegroundColor DarkGray
            
            # Show first few lines of ErrorOutput if present (docker-compose writes to stderr)
            if ($errorOutputCount -gt 0 -and $result.ErrorOutput) {
                $previewLines = [Math]::Min(3, $errorOutputCount)
                Write-Log "[DEBUG] ErrorOutput preview (first $previewLines lines):" -ForegroundColor DarkGray
                for ($i = 0; $i -lt $previewLines; $i++) {
                    Write-Log "[DEBUG]   [$i]: $($result.ErrorOutput[$i])" -ForegroundColor DarkGray
                }
            }
            
            # Show first few lines of Output if present
            if ($outputCount -gt 0 -and $result.Output) {
                $previewLines = [Math]::Min(3, $outputCount)
                Write-Log "[DEBUG] Output preview (first $previewLines lines):" -ForegroundColor DarkGray
                for ($i = 0; $i -lt $previewLines; $i++) {
                    Write-Log "[DEBUG]   [$i]: $($result.Output[$i])" -ForegroundColor DarkGray
                }
            }
        } else {
            Write-Log "[DEBUG] Result properties: $($result.PSObject.Properties.Name -join ', ')" -ForegroundColor DarkGray
        }
        
        if ($exitCode -eq 0) {
            Write-Log "Development container started!" -ForegroundColor Green
            Write-Log ""
            Write-Log "To execute commands:" -ForegroundColor Yellow
            Write-Log "  docker-compose exec dev npm run compile" -ForegroundColor Gray
            Write-Log "  docker-compose exec dev npm test" -ForegroundColor Gray
            Write-Log "  docker-compose exec dev bash" -ForegroundColor Gray
            Write-Log ""
            Write-Log "To test npm compile with diagnostics:" -ForegroundColor Yellow
            Write-Log "  .\build-docker.ps1 test-compile" -ForegroundColor Gray
            Write-Log ""
            Write-Log "[DEBUG] Checking container logs for any startup errors..." -ForegroundColor DarkGray
            $logsResult = Invoke-LoggedCommand -Command "docker-compose" -Arguments @("logs", "--tail=20", "dev") -CaptureOutput
            if ($logsResult.ExitCode -eq 0 -and $logsResult.Output) {
                $errorLines = $logsResult.Output | Where-Object { $_ -match "ERROR|error|✗|WARNING|warning" }
                if ($errorLines) {
                    Write-Log "Found potential issues in container logs:" -ForegroundColor Yellow
                    $errorLines | ForEach-Object { Write-Log "  $_" -ForegroundColor Yellow }
                } else {
                    Write-Log "[DEBUG] No errors found in container startup logs" -ForegroundColor DarkGray
                }
            }
        } else {
            Write-Log "Failed to start development container! Exit code: $exitCode" -ForegroundColor Red
            if ($result.ErrorOutput) {
                Write-Log "Error output:" -ForegroundColor Red
                $result.ErrorOutput | ForEach-Object { Write-Log "  $_" -ForegroundColor Red }
            }
            if ($result.Output) {
                Write-Log "Output:" -ForegroundColor Yellow
                $result.Output | Select-Object -Last 20 | ForEach-Object { Write-Log "  $_" -ForegroundColor Gray }
            }
            exit 1
        }
    } catch {
        Write-Log "ERROR: Exception in Start-DevContainer: $($_.Exception.Message)" -ForegroundColor Red
        Write-Log "Exception type: $($_.Exception.GetType().FullName)" -ForegroundColor Red
        Write-Log "Stack trace: $($_.ScriptStackTrace)" -ForegroundColor Yellow
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
    
    # Get absolute paths and convert Windows backslashes to forward slashes
    # Docker Desktop on Windows requires forward slashes in volume mount paths
    $distPathRaw = (Resolve-Path "dist").Path -replace '\\', '/'
    $scriptPathRaw = (Resolve-Path "docker-package.sh").Path -replace '\\', '/'
    
    Write-Log "[DEBUG] Dist path (original): $((Resolve-Path 'dist').Path)" -ForegroundColor DarkGray
    Write-Log "[DEBUG] Dist path (converted): $distPathRaw" -ForegroundColor DarkGray
    Write-Log "[DEBUG] Script path (original): $((Resolve-Path 'docker-package.sh').Path)" -ForegroundColor DarkGray
    Write-Log "[DEBUG] Script path (converted): $scriptPathRaw" -ForegroundColor DarkGray
    
    # Build volume mount arguments - the entire "host_path:container_path" must be a single argument
    # If the path contains spaces, we need to ensure it's treated as one argument
    # Start-Process with ArgumentList array handles this correctly, but we need to ensure
    # the volume mount specification is a single string element
    $distVolume = "${distPathRaw}:/app/dist"
    $scriptVolume = "${scriptPathRaw}:/tmp/docker-package.sh:ro"
    
    Write-Log "[DEBUG] Dist volume mount: $distVolume" -ForegroundColor DarkGray
    Write-Log "[DEBUG] Script volume mount: $scriptVolume" -ForegroundColor DarkGray
    
    # Docker Desktop on Windows handles Windows paths with forward slashes
    # Each volume mount argument must be a single array element (Start-Process handles quoting)
    $packageArgs = @(
        "run", "--rm",
        "-v", $distVolume,
        "-v", $scriptVolume,
        "-w", "/app",
        $Tag,
        "bash", "/tmp/docker-package.sh"
    )
    
    Write-Log "[DEBUG] Package arguments: $($packageArgs -join ' ')" -ForegroundColor DarkGray
    Write-Log "[DEBUG] Using CaptureOutput for better path handling" -ForegroundColor DarkGray
    
    $result = Invoke-LoggedCommand -Command "docker" -Arguments $packageArgs -CaptureOutput
    $exitCode = $result.ExitCode
    
    if ($exitCode -eq 0) {
        Write-Log "Extension packaged successfully!" -ForegroundColor Green
        Write-Log "VSIX file: dist/dataflow-analyzer.vsix" -ForegroundColor Yellow
    } else {
        Write-Log "Packaging failed!" -ForegroundColor Red
        exit 1
    }
}

function Test-NpmCompile {
    <#
    .SYNOPSIS
    Tests npm run compile in the dev container with comprehensive error logging
    #>
    Write-Log "Testing npm run compile in dev container..." -ForegroundColor Cyan
    
    try {
        Write-Log "[DEBUG] Checking if dev container is running..." -ForegroundColor DarkGray
        $containerCheck = Invoke-LoggedCommand -Command "docker-compose" -Arguments @("ps", "-q", "dev") -CaptureOutput
        if (-not $containerCheck.Output -or $containerCheck.Output.Count -eq 0) {
            Write-Log "ERROR: Dev container is not running. Start it first with: .\build-docker.ps1 dev" -ForegroundColor Red
            exit 1
        }
        
        Write-Log "[DEBUG] Dev container is running" -ForegroundColor DarkGray
        
        # Run comprehensive diagnostics first
        Write-Log "Running diagnostics..." -ForegroundColor Yellow
        $diagnosticsCmd = @'
echo "=== NPM COMPILE DIAGNOSTICS ==="
echo ""
echo "1. Checking Node.js and npm:"
node --version 2>&1 || echo "ERROR: node not found"
npm --version 2>&1 || echo "ERROR: npm not found"
echo ""
echo "2. Checking PATH:"
echo "PATH=$PATH"
echo ""
echo "3. Checking node_modules:"
if [ -d "/app/node_modules" ]; then
  echo "✓ node_modules directory exists"
  echo "  Size: $(du -sh /app/node_modules | cut -f1)"
  echo "  File count: $(find /app/node_modules -type f | wc -l)"
else
  echo "✗ ERROR: node_modules directory missing"
fi
echo ""
echo "4. Checking TypeScript compiler:"
if [ -f "/app/node_modules/.bin/tsc" ]; then
  echo "✓ tsc found at: /app/node_modules/.bin/tsc"
  /app/node_modules/.bin/tsc --version 2>&1 || echo "ERROR: tsc version check failed"
else
  echo "✗ ERROR: tsc not found in node_modules/.bin"
  echo "  Checking for typescript package..."
  if [ -d "/app/node_modules/typescript" ]; then
    echo "  ✓ typescript package exists"
    ls -la /app/node_modules/typescript/bin/ 2>&1 || echo "  ERROR: typescript/bin directory missing"
  else
    echo "  ✗ ERROR: typescript package missing"
  fi
fi
echo ""
echo "5. Checking config files:"
[ -f "/app/tsconfig.json" ] && echo "✓ tsconfig.json exists" || echo "✗ ERROR: tsconfig.json missing"
[ -f "/app/package.json" ] && echo "✓ package.json exists" || echo "✗ ERROR: package.json missing"
echo ""
echo "6. Checking source directory:"
[ -d "/app/src" ] && echo "✓ src directory exists ($(find /app/src -name '*.ts' | wc -l) TypeScript files)" || echo "✗ ERROR: src directory missing"
echo ""
echo "7. Checking out directory:"
[ -d "/app/out" ] && echo "✓ out directory exists (writable)" || echo "⚠ WARNING: out directory missing (will be created)"
echo ""
echo "=== END DIAGNOSTICS ==="
'@
        
        $diagnosticsResult = Invoke-LoggedCommand -Command "docker-compose" -Arguments @("exec", "-T", "dev", "bash", "-c", $diagnosticsCmd) -CaptureOutput
        if ($diagnosticsResult.ExitCode -eq 0) {
            Write-Log "Diagnostics output:" -ForegroundColor Cyan
            if ($diagnosticsResult.Output) {
                $diagnosticsResult.Output | ForEach-Object { Write-Log "  $_" -ForegroundColor Gray }
            }
            if ($diagnosticsResult.ErrorOutput) {
                $diagnosticsResult.ErrorOutput | ForEach-Object { Write-Log "  $_" -ForegroundColor Yellow }
            }
        } else {
            Write-Log "WARNING: Diagnostics command failed with exit code $($diagnosticsResult.ExitCode)" -ForegroundColor Yellow
            if ($diagnosticsResult.ErrorOutput) {
                $diagnosticsResult.ErrorOutput | ForEach-Object { Write-Log "  $_" -ForegroundColor Yellow }
            }
        }
        
        Write-Log ""
        Write-Log "Attempting npm run compile..." -ForegroundColor Yellow
        
        # Run npm compile with detailed error capture
        $compileResult = Invoke-LoggedCommand -Command "docker-compose" -Arguments @("exec", "-T", "dev", "bash", "-c", "set -e; cd /app && npm run compile 2>&1") -CaptureOutput
        
        if ($compileResult.ExitCode -eq 0) {
            Write-Log "✓ npm run compile succeeded!" -ForegroundColor Green
            if ($compileResult.Output) {
                Write-Log "Compile output:" -ForegroundColor Gray
                $compileResult.Output | Select-Object -Last 20 | ForEach-Object { Write-Log "  $_" -ForegroundColor Gray }
            }
            return $true
        } else {
            Write-Log "✗ npm run compile FAILED with exit code $($compileResult.ExitCode)" -ForegroundColor Red
            Write-Log ""
            Write-Log "=== COMPILE ERROR DETAILS ===" -ForegroundColor Red
            
            if ($compileResult.ErrorOutput) {
                Write-Log "Error output (stderr):" -ForegroundColor Red
                $compileResult.ErrorOutput | ForEach-Object { Write-Log "  $_" -ForegroundColor Red }
            }
            
            if ($compileResult.Output) {
                Write-Log "Standard output (stdout):" -ForegroundColor Yellow
                $compileResult.Output | ForEach-Object { Write-Log "  $_" -ForegroundColor Yellow }
            }
            
            Write-Log ""
            Write-Log "=== TROUBLESHOOTING SUGGESTIONS ===" -ForegroundColor Yellow
            Write-Log "1. Check if TypeScript is installed: docker-compose exec dev npm list typescript" -ForegroundColor Gray
            Write-Log "2. Check if node_modules is complete: docker-compose exec dev ls -la /app/node_modules/.bin/ | grep tsc" -ForegroundColor Gray
            Write-Log "3. Try reinstalling dependencies: docker-compose exec dev npm ci" -ForegroundColor Gray
            Write-Log "4. Check tsconfig.json: docker-compose exec dev cat /app/tsconfig.json" -ForegroundColor Gray
            Write-Log "5. Check for TypeScript errors: docker-compose exec dev npx tsc --noEmit" -ForegroundColor Gray
            
            return $false
        }
    } catch {
        Write-Log "ERROR: Exception in Test-NpmCompile: $($_.Exception.Message)" -ForegroundColor Red
        Write-Log "Exception type: $($_.Exception.GetType().FullName)" -ForegroundColor Red
        Write-Log "Stack trace: $($_.ScriptStackTrace)" -ForegroundColor Yellow
        return $false
    }
}

function Run-Tests {
    Write-Log "Running tests in Docker container..." -ForegroundColor Cyan
    
    # Run tests in the container's /app directory (not mounted workspace)
    # This ensures node_modules and devDependencies are available
    # Convert Windows paths to forward slashes for Docker
    $srcPath = (Resolve-Path "src").Path -replace '\\', '/'
    $testsPath = (Resolve-Path "tests").Path -replace '\\', '/'
    
    Write-Log "[DEBUG] Source path: $srcPath" -ForegroundColor DarkGray
    Write-Log "[DEBUG] Tests path: $testsPath" -ForegroundColor DarkGray
    
    # First, verify npm compile works (tests run pretest which includes compile)
    Write-Log "[DEBUG] Tests include pretest which runs npm run compile, checking setup..." -ForegroundColor DarkGray
    
    $testArgs = @(
        "run", "--rm",
        "-v", "${srcPath}:/app/src:ro",
        "-v", "${testsPath}:/app/tests:ro",
        "-w", "/app",
        $Tag,
        "sh", "-c", "npm test"
    )
    
    Write-Log "[DEBUG] Running: docker $($testArgs -join ' ')" -ForegroundColor DarkGray
    $result = Invoke-LoggedCommand -Command "docker" -Arguments $testArgs -CaptureOutput
    $exitCode = $result.ExitCode
    
    if ($exitCode -ne 0) {
        Write-Log "Tests failed with exit code: $exitCode" -ForegroundColor Red
        Write-Log ""
        Write-Log "=== TEST ERROR DETAILS ===" -ForegroundColor Red
        
        if ($result.ErrorOutput) {
            Write-Log "Error output (stderr):" -ForegroundColor Red
            $result.ErrorOutput | Select-Object -Last 50 | ForEach-Object { Write-Log "  $_" -ForegroundColor Red }
        }
        
        if ($result.Output) {
            Write-Log "Standard output (stdout):" -ForegroundColor Yellow
            $result.Output | Select-Object -Last 50 | ForEach-Object { Write-Log "  $_" -ForegroundColor Yellow }
        }
        
        Write-Log ""
        Write-Log "=== TROUBLESHOOTING ===" -ForegroundColor Yellow
        Write-Log "If compilation failed, run: .\build-docker.ps1 test-compile" -ForegroundColor Gray
        Write-Log "To see full test output, check logs2.txt" -ForegroundColor Gray
        
        exit 1
    } else {
        Write-Log "Tests completed successfully!" -ForegroundColor Green
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
        "test-compile" {
            # Test npm compile specifically with detailed diagnostics
            if (-not (Test-Path "docker-compose.yml")) {
                Write-Log "ERROR: docker-compose.yml not found. Run '.\build-docker.ps1 dev' first to start the dev container." -ForegroundColor Red
                exit 1
            }
            $success = Test-NpmCompile
            if (-not $success) {
                exit 1
            }
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
    
    # Safely escape strings for logging to avoid quote issues
    $errorMsg = $_.Exception.Message -replace '"', '""'
    $stackTrace = $_.ScriptStackTrace -replace '"', '""'
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    
    Add-Content -Path $LogFile -Value "[$timestamp] ERROR: $errorMsg" -ErrorAction SilentlyContinue
    Add-Content -Path $LogFile -Value "[$timestamp] STACKTRACE: $stackTrace" -ErrorAction SilentlyContinue
    exit 1
}


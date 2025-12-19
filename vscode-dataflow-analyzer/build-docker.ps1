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
        [switch]$CaptureOutput,
        [string]$WorkingDirectory = $null
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $fullCommand = if ($Arguments.Count -gt 0) { "$Command $($Arguments -join ' ')" } else { $Command }
    # Escape quotes in command string to prevent parsing issues
    # Use variables for replacement strings to avoid quote parsing issues
    # Construct double quote using char code to avoid parsing issues
    $doubleQuote = [char]34
    $doubleDoubleQuote = [char]34 + [char]34
    $fullCommandEscaped = $fullCommand -replace [regex]::Escape($doubleQuote), $doubleDoubleQuote
    # Build log entry using concatenation to avoid string interpolation issues
    $logEntry = '[' + $timestamp + '] Executing: ' + $fullCommandEscaped
    Add-Content -Path $LogFile -Value $logEntry -ErrorAction SilentlyContinue
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
            $argsCount = $Arguments.Count
            $firstArg = if ($Arguments.Count -gt 0) { $Arguments[0] } else { 'none' }
            Write-Log "[DEBUG] Arguments count: $argsCount" -ForegroundColor DarkGray
            Write-Log "[DEBUG] First argument: $firstArg" -ForegroundColor DarkGray
            # Show all arguments for debugging (use -join for PowerShell 5.1 compatibility)
            $argsDebug = $Arguments | ForEach-Object { "'$_'" } | ForEach-Object { $_ }
            $argsDebugStr = $argsDebug -join ', '
            Write-Log "[DEBUG] All arguments: $argsDebugStr" -ForegroundColor DarkGray
            
            # Use temporary files for output capture
            $stdoutFile = "$env:TEMP\docker_stdout_$(Get-Date -Format 'yyyyMMddHHmmss').txt"
            $stderrFile = "$env:TEMP\docker_stderr_$(Get-Date -Format 'yyyyMMddHHmmss').txt"
            
            try {
                # Execute using Start-Process with proper redirection
                # CRITICAL: Start-Process with ArgumentList passes each array element as a separate argument
                # When paths contain spaces, Docker sees them as separate arguments (e.g., "sem" and "7/Program")
                # Solution: Build a single quoted argument string for paths with spaces
                # For Docker volume mounts with spaces, we need to quote the entire "host_path:container_path" value
                # Also handle -c flag (for sh -c) to ensure the command string is properly quoted
                $quotedArguments = @()
                $i = 0
                $doubleQuote = [char]34
                while ($i -lt $Arguments.Count) {
                    $arg = $Arguments[$i]
                    # Check if this is a volume mount argument (-v) and the next argument contains spaces
                    if ($arg -eq "-v" -and $i + 1 -lt $Arguments.Count) {
                        $volumeArg = $Arguments[$i + 1]
                        if ($volumeArg -match ' ') {
                            # Quote the entire volume mount specification
                            # Use string concatenation to avoid backtick parsing issues
                            $quotedVolumeArg = $doubleQuote + $volumeArg + $doubleQuote
                            $quotedArguments += $arg
                            $quotedArguments += $quotedVolumeArg
                            $i += 2
                        } else {
                            $quotedArguments += $arg
                            $i++
                        }
                    } elseif ($arg -eq "-c" -and $i + 1 -lt $Arguments.Count) {
                        # Handle -c flag: ensure the command string is properly quoted
                        # This is critical for sh -c to receive the command as a single string
                        # PowerShell string values don't include quotes, so we always add them
                        $commandArg = $Arguments[$i + 1]
                        $quotedCommandArg = $doubleQuote + $commandArg + $doubleQuote
                        $quotedArguments += $arg
                        $quotedArguments += $quotedCommandArg
                        $i += 2
                    } else {
                        $quotedArguments += $arg
                        $i++
                    }
                }
                
                Write-Log "[DEBUG] Using quoted arguments for volume mounts with spaces" -ForegroundColor DarkGray
                
                # Initialize output variables
                $output = @()
                $errorOutputArray = @()
                
                # Special handling for long-running commands like docker build
                # Use real-time streaming instead of waiting for completion
                $isLongRunningCommand = ($Command -eq "docker" -and $Arguments.Count -gt 0 -and $Arguments[0] -eq "build")
                
                if ($isLongRunningCommand) {
                    Write-Log "[DEBUG-L1] === ENTERING LONG-RUNNING COMMAND HANDLER ===" -ForegroundColor Cyan
                    Write-Log "[DEBUG-L1] Detected long-running docker build command" -ForegroundColor DarkGray
                    Write-Log "[DEBUG-L1] Command: $Command" -ForegroundColor DarkGray
                    Write-Log "[DEBUG-L1] Arguments count: $($Arguments.Count)" -ForegroundColor DarkGray
                    Write-Log "[DEBUG-L1] Arguments: $($Arguments -join ' | ')" -ForegroundColor DarkGray
                    
                    # Initialize output variables
                    $output = @()
                    $errorOutputArray = @()
                    $exitCode = 0
                    
                    try {
                        Write-Log "[DEBUG-L2] === STARTING DOCKER BUILD EXECUTION ===" -ForegroundColor Cyan
                        Write-Log "[DEBUG-L2] Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss.fff')" -ForegroundColor DarkGray
                        
                        # Use Start-Job for true async execution that we can monitor
                        Write-Log "[DEBUG-L3] Creating background job for docker build..." -ForegroundColor DarkGray
                        Write-Log "[DEBUG-L3] Preparing arguments for job..." -ForegroundColor DarkGray
                        Write-Log "[DEBUG-L3] Arguments array type: $($Arguments.GetType().FullName)" -ForegroundColor DarkGray
                        Write-Log "[DEBUG-L3] Arguments array count: $($Arguments.Count)" -ForegroundColor DarkGray
                        $argsDebug = ($Arguments | ForEach-Object { "'$_'" }) -join ', '
                        Write-Log "[DEBUG-L3] Arguments array contents: $argsDebug" -ForegroundColor DarkGray
                        
                        # Serialize arguments as a comma-separated string to avoid PowerShell job serialization issues
                        # Then reconstruct the array in the job script
                        $argsString = $Arguments -join '|ARGSEP|'
                        Write-Log "[DEBUG-L3] Serialized arguments string length: $($argsString.Length)" -ForegroundColor DarkGray
                        
                        $jobScript = {
                            param($Cmd, $ArgsString, $BuildContextPath)
                            Write-Output "[JOB-START] Job started at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss.fff')"
                            Write-Output "[JOB-INFO] Command: $Cmd"
                            Write-Output "[JOB-INFO] Build context path: $BuildContextPath"
                            
                            # CRITICAL: Change to the build context directory before running docker build
                            # Docker build uses "." as the build context, so we must be in the correct directory
                            try {
                                Set-Location -Path $BuildContextPath -ErrorAction Stop
                                Write-Output "[JOB-INFO] Changed to build context directory: $(Get-Location)"
                            } catch {
                                Write-Output "[JOB-ERROR] Failed to change to build context directory: $($_.Exception.Message)"
                                return 1
                            }
                            
                            # Reconstruct arguments array from serialized string
                            $Args = $ArgsString -split '\|ARGSEP\|'
                            Write-Output "[JOB-INFO] Arguments count: $($Args.Count)"
                            Write-Output "[JOB-INFO] Arguments: $($Args -join ' ')"
                            
                            # Verify Dockerfile exists in current directory
                            $dockerfileArgIndex = -1
                            for ($i = 0; $i -lt $Args.Count; $i++) {
                                if ($Args[$i] -eq "-f" -and $i + 1 -lt $Args.Count) {
                                    $dockerfileArgIndex = $i + 1
                                    break
                                }
                            }
                            if ($dockerfileArgIndex -ge 0) {
                                $dockerfileRelative = $Args[$dockerfileArgIndex]
                                $dockerfilePath = Join-Path (Get-Location).Path $dockerfileRelative
                                if (-not (Test-Path $dockerfilePath)) {
                                    Write-Output "[JOB-ERROR] Dockerfile not found in build context: $dockerfilePath"
                                    Write-Output "[JOB-ERROR] Current directory: $(Get-Location)"
                                    Write-Output "[JOB-ERROR] Expected Dockerfile: $dockerfileRelative"
                                    return 1
                                }
                                Write-Output "[JOB-INFO] Verified Dockerfile exists: $dockerfilePath"
                            }
                            
                            try {
                                Write-Output "[JOB-INFO] Executing: $Cmd $($Args -join ' ')"
                                & $Cmd @Args 2>&1 | ForEach-Object {
                                    Write-Output $_
                                }
                                $exitCode = $LASTEXITCODE
                                Write-Output "[JOB-END] Job completed with exit code: $exitCode at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss.fff')"
                                return $exitCode
                            } catch {
                                Write-Output "[JOB-ERROR] Exception: $($_.Exception.Message)"
                                Write-Output "[JOB-ERROR] Stack trace: $($_.ScriptStackTrace)"
                                return 1
                            }
                        }
                        
                        Write-Log "[DEBUG-L3] Job script created, starting job..." -ForegroundColor DarkGray
                        Write-Log "[DEBUG-L3] Build context path for job: $buildContext" -ForegroundColor DarkGray
                        $jobStartTime = Get-Date
                        $job = Start-Job -ScriptBlock $jobScript -ArgumentList $Command, $argsString, $buildContext
                        Write-Log "[DEBUG-L3] Job started successfully, Job ID: $($job.Id)" -ForegroundColor Green
                        Write-Log "[DEBUG-L3] Job state: $($job.State)" -ForegroundColor DarkGray
                        Write-Log "[DEBUG-L3] Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss.fff')" -ForegroundColor DarkGray
                        
                        # Monitor job and stream output in real-time
                        Write-Log "[DEBUG-L4] === ENTERING JOB MONITORING LOOP ===" -ForegroundColor Cyan
                        $outputLines = @()
                        $errorLines = @()
                        $lastOutputTime = Get-Date
                        $lastStatusLogTime = Get-Date
                        $statusLogIntervalSeconds = 5  # Log status every 5 seconds
                        $noOutputTimeoutSeconds = 60  # 1 minute without output = potential issue
                        $overallTimeoutSeconds = 3600  # 1 hour total timeout
                        $iterationCount = 0
                        
                        while ($job.State -eq 'Running') {
                            $iterationCount++
                            $currentTime = Get-Date
                            $elapsed = $currentTime - $jobStartTime
                            $timeSinceLastOutput = $currentTime - $lastOutputTime
                            
                            # Receive any available output from the job
                            $jobOutput = Receive-Job -Job $job
                            if ($jobOutput) {
                                $lastOutputTime = $currentTime
                                foreach ($line in $jobOutput) {
                                    $lineStr = $line.ToString()
                                    
                                    # Check for job control messages
                                    if ($lineStr -match '\[JOB-') {
                                        Write-Log "[DEBUG-L5] $lineStr" -ForegroundColor Magenta
                                        if ($lineStr -match '\[JOB-ERROR\]') {
                                            $errorLines += $lineStr
                                        }
                                    } else {
                                        # Regular output
                                        $outputLines += $lineStr
                                        Write-Host $lineStr
                                        Add-Content -Path $LogFile -Value $lineStr -ErrorAction SilentlyContinue
                                    }
                                }
                            }
                            
                            # Log status periodically
                            $timeSinceLastStatusLog = $currentTime - $lastStatusLogTime
                            if ($timeSinceLastStatusLog.TotalSeconds -ge $statusLogIntervalSeconds) {
                                $statusMsg = "[DEBUG-L4] Status check #${iterationCount}: Elapsed=$([math]::Floor($elapsed.TotalSeconds))s, State=$($job.State), OutputLines=$($outputLines.Count), LastOutput=$([math]::Floor($timeSinceLastOutput.TotalSeconds))s ago"
                                Write-Log $statusMsg -ForegroundColor Yellow
                                $lastStatusLogTime = $currentTime
                            }
                            
                            # Check for no output timeout
                            if ($timeSinceLastOutput.TotalSeconds -gt $noOutputTimeoutSeconds -and $outputLines.Count -eq 0) {
                                Write-Log "[DEBUG-L4] WARNING: No output received for $([math]::Floor($timeSinceLastOutput.TotalSeconds)) seconds!" -ForegroundColor Red
                                Write-Log "[DEBUG-L4] Job state: $($job.State)" -ForegroundColor Red
                                Write-Log "[DEBUG-L4] This may indicate the process is hung" -ForegroundColor Red
                            }
                            
                            # Check for overall timeout
                            if ($elapsed.TotalSeconds -gt $overallTimeoutSeconds) {
                                Write-Log "[DEBUG-L4] ERROR: Overall timeout of $overallTimeoutSeconds seconds exceeded!" -ForegroundColor Red
                                Write-Log "[DEBUG-L4] Stopping job..." -ForegroundColor Red
                                Stop-Job -Job $job
                                Remove-Job -Job $job -Force
                                throw "Docker build exceeded timeout of $overallTimeoutSeconds seconds"
                            }
                            
                            # Small sleep to prevent CPU spinning
                            Start-Sleep -Milliseconds 500
                        }
                        
                        Write-Log "[DEBUG-L4] === EXITING JOB MONITORING LOOP ===" -ForegroundColor Cyan
                        Write-Log "[DEBUG-L4] Final job state: $($job.State)" -ForegroundColor DarkGray
                        Write-Log "[DEBUG-L4] Total iterations: $iterationCount" -ForegroundColor DarkGray
                        Write-Log "[DEBUG-L4] Total elapsed time: $([math]::Floor($elapsed.TotalSeconds)) seconds" -ForegroundColor DarkGray
                        
                        # Get any remaining output
                        Write-Log "[DEBUG-L5] Receiving final job output..." -ForegroundColor DarkGray
                        $finalOutput = Receive-Job -Job $job
                        if ($finalOutput) {
                            foreach ($line in $finalOutput) {
                                $lineStr = $line.ToString()
                                if ($lineStr -match '\[JOB-') {
                                    Write-Log "[DEBUG-L5] $lineStr" -ForegroundColor Magenta
                                    if ($lineStr -match '\[JOB-END\]') {
                                        if ($lineStr -match 'exit code: (\d+)') {
                                            $exitCode = [int]$matches[1]
                                        }
                                    } elseif ($lineStr -match '\[JOB-ERROR\]') {
                                        $errorLines += $lineStr
                                    }
                                } else {
                                    $outputLines += $lineStr
                                    Write-Host $lineStr
                                    Add-Content -Path $LogFile -Value $lineStr -ErrorAction SilentlyContinue
                                }
                            }
                        }
                        
                        # Clean up job
                        Write-Log "[DEBUG-L5] Cleaning up job..." -ForegroundColor DarkGray
                        Remove-Job -Job $job -Force
                        Write-Log "[DEBUG-L5] Job removed" -ForegroundColor DarkGray
                        
                        # Process output
                        Write-Log "[DEBUG-L6] Processing output lines..." -ForegroundColor DarkGray
                        Write-Log "[DEBUG-L6] Total output lines: $($outputLines.Count)" -ForegroundColor DarkGray
                        Write-Log "[DEBUG-L6] Total error lines: $($errorLines.Count)" -ForegroundColor DarkGray
                        
                        $output = $outputLines | Where-Object { $_.Trim().Length -gt 0 }
                        $errorOutputArray = $errorLines | Where-Object { $_.Trim().Length -gt 0 }
                        
                        Write-Log "[DEBUG-L6] Processed output count: $($output.Count)" -ForegroundColor DarkGray
                        Write-Log "[DEBUG-L6] Processed error count: $($errorOutputArray.Count)" -ForegroundColor DarkGray
                        Write-Log "[DEBUG-L6] Final exit code: $exitCode" -ForegroundColor DarkGray
                        Write-Log "[DEBUG-L2] === DOCKER BUILD EXECUTION COMPLETED ===" -ForegroundColor Cyan
                        
                    } catch {
                        Write-Log "[DEBUG-ERROR] === EXCEPTION IN DOCKER BUILD HANDLER ===" -ForegroundColor Red
                        $errorMsg = $_.Exception.Message
                        $errorStackTrace = $_.ScriptStackTrace
                        Write-Log "[DEBUG-ERROR] Exception message: $errorMsg" -ForegroundColor Red
                        Write-Log "[DEBUG-ERROR] Stack trace: $errorStackTrace" -ForegroundColor Red
                        
                        # Try to clean up job if it exists
                        if ($job) {
                            Write-Log "[DEBUG-ERROR] Attempting to clean up job..." -ForegroundColor Yellow
                            try {
                                Stop-Job -Job $job -ErrorAction SilentlyContinue
                                Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
                            } catch {
                                Write-Log "[DEBUG-ERROR] Failed to clean up job: $($_.Exception.Message)" -ForegroundColor Red
                            }
                        }
                        
                        $exitCode = 1
                        $errorOutputArray = @($errorMsg)
                    }
                    
                    Write-Log "[DEBUG-L1] === EXITING LONG-RUNNING COMMAND HANDLER ===" -ForegroundColor Cyan
                    Write-Log "[DEBUG-L1] Final exit code: $exitCode" -ForegroundColor DarkGray
                } else {
                    # For shorter commands, use the original method
                    Write-Log "[DEBUG] Using standard Start-Process with file redirection" -ForegroundColor DarkGray
                    $processParams = @{
                        FilePath = $Command
                        ArgumentList = $quotedArguments
                        NoNewWindow = $true
                        PassThru = $true
                        Wait = $true
                        RedirectStandardOutput = $stdoutFile
                        RedirectStandardError = $stderrFile
                    }
                    # Set working directory if specified
                    if ($WorkingDirectory) {
                        $processParams['WorkingDirectory'] = $WorkingDirectory
                        Write-Log "[DEBUG] Setting working directory: $WorkingDirectory" -ForegroundColor DarkGray
                    }
                    $process = Start-Process @processParams
                    $exitCode = $process.ExitCode
                    
                    Write-Log "[DEBUG] Process exit code: $exitCode" -ForegroundColor DarkGray
                    
                    # Read captured output from files (only for non-long-running commands)
                    if (Test-Path $stdoutFile) {
                        $outputRaw = Get-Content $stdoutFile -ErrorAction SilentlyContinue -Raw
                        if ($outputRaw -and $outputRaw.Trim().Length -gt 0) {
                            $outputRaw -split [Environment]::NewLine | ForEach-Object { 
                                if ($_.Trim().Length -gt 0) {
                                    Add-Content -Path $LogFile -Value $_ -ErrorAction SilentlyContinue
                                    Write-Host $_
                                }
                            }
                            $output = $outputRaw -split [Environment]::NewLine | Where-Object { $_.Trim().Length -gt 0 }
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
                                $errorOutput -split [Environment]::NewLine | ForEach-Object { 
                                    if ($_.Trim().Length -gt 0) {
                                        Add-Content -Path $LogFile -Value "STDERR: $_" -ErrorAction SilentlyContinue
                                        Write-Host $_ -ForegroundColor Yellow
                                    }
                                }
                            } else {
                                # For successful docker-compose commands, stderr is just informational
                                $errorOutput -split [Environment]::NewLine | ForEach-Object { 
                                    if ($_.Trim().Length -gt 0) {
                                        Add-Content -Path $LogFile -Value $_ -ErrorAction SilentlyContinue
                                        Write-Host $_ -ForegroundColor Gray
                                    }
                                }
                            }
                        }
                        # Convert to array for return value
                        $errorOutputArray = if ($errorOutput) { $errorOutput -split [Environment]::NewLine | Where-Object { $_.Trim().Length -gt 0 } } else { @() }
                    } else {
                        $errorOutputArray = @()
                    }
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
                $exceptionMsg = $_.Exception.Message
                Write-Log "[DEBUG] Exception: $exceptionMsg" -ForegroundColor DarkGray
                
                # Handle volume mount arguments with spaces (same logic as CaptureOutput path)
                # Also handle -c flag for proper command quoting
                $quotedArguments = @()
                $i = 0
                $doubleQuote = [char]34
                while ($i -lt $Arguments.Count) {
                    $arg = $Arguments[$i]
                    if ($arg -eq "-v" -and $i + 1 -lt $Arguments.Count) {
                        $volumeArg = $Arguments[$i + 1]
                        if ($volumeArg -match ' ') {
                            # Use string concatenation to avoid backtick parsing issues
                            $quotedVolumeArg = $doubleQuote + $volumeArg + $doubleQuote
                            $quotedArguments += $arg
                            $quotedArguments += $quotedVolumeArg
                            $i += 2
                        } else {
                            $quotedArguments += $arg
                            $i++
                        }
                    } elseif ($arg -eq "-c" -and $i + 1 -lt $Arguments.Count) {
                        # Handle -c flag: ensure the command string is properly quoted
                        # PowerShell string values don't include quotes, so we always add them
                        $commandArg = $Arguments[$i + 1]
                        $quotedCommandArg = $doubleQuote + $commandArg + $doubleQuote
                        $quotedArguments += $arg
                        $quotedArguments += $quotedCommandArg
                        $i += 2
                    } else {
                        $quotedArguments += $arg
                        $i++
                    }
                }
                
                $stdoutFile = "$env:TEMP\docker_output_$(Get-Date -Format 'yyyyMMddHHmmss').txt"
                $stderrFile = "$env:TEMP\docker_error_$(Get-Date -Format 'yyyyMMddHHmmss').txt"
                
                $processParams = @{
                    FilePath = $Command
                    ArgumentList = $quotedArguments
                    NoNewWindow = $true
                    Wait = $true
                    PassThru = $true
                    RedirectStandardOutput = $stdoutFile
                    RedirectStandardError = $stderrFile
                }
                # Set working directory if specified
                if ($WorkingDirectory) {
                    $processParams['WorkingDirectory'] = $WorkingDirectory
                }
                $process = Start-Process @processParams
                $exitCode = $process.ExitCode
                
                Write-Log "[DEBUG] Alternative method exit code: $exitCode" -ForegroundColor DarkGray
                
                if (Test-Path $stdoutFile) {
                    $stdoutContent = Get-Content $stdoutFile -ErrorAction SilentlyContinue -Raw
                    if ($stdoutContent -and $stdoutContent.Trim().Length -gt 0) {
                        $stdoutContent -split [Environment]::NewLine | ForEach-Object {
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
                        $stderrContent -split [Environment]::NewLine | ForEach-Object {
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
        # Build log entries using concatenation to avoid string interpolation issues
        $exceptionMsgRaw = $_.Exception.Message
        $errorDetails = $_.Exception | Format-List -Force | Out-String
        
        # Use variables for replacement strings to avoid quote parsing issues
        # Construct double quote using char code to avoid parsing issues
        $doubleQuote = [char]34
        $doubleDoubleQuote = [char]34 + [char]34
        
        # Build error message using concatenation
        $fullCommandEscaped = $fullCommand -replace [regex]::Escape($doubleQuote), $doubleDoubleQuote
        $exceptionMsgEscaped = $exceptionMsgRaw -replace [regex]::Escape($doubleQuote), $doubleDoubleQuote
        $errorMsg = '[' + $timestamp + '] ERROR executing ' + $fullCommandEscaped + ' : ' + $exceptionMsgEscaped
        $errorDetailsEscaped = $errorDetails -replace [regex]::Escape($doubleQuote), $doubleDoubleQuote
        $errorDetailsLogEntry = 'Exception details: ' + $errorDetailsEscaped
        
        Write-Log $errorMsg -ForegroundColor Red
        Write-Log "Exception details: $errorDetails" -ForegroundColor Red
        Add-Content -Path $LogFile -Value $errorMsg -ErrorAction SilentlyContinue
        Add-Content -Path $LogFile -Value $errorDetailsLogEntry -ErrorAction SilentlyContinue
        
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
    Write-Host @'
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
'@
}

function Build-Image {
    param([bool]$UseWindows)
    
    # Get the current directory and ensure we're in the right place
    $currentDir = Get-Location
    $dockerfileRelative = if ($UseWindows) { "Dockerfile.windows" } else { "Dockerfile" }
    
    # Resolve absolute path to Dockerfile to handle paths with spaces
    $dockerfileAbsolute = (Resolve-Path $dockerfileRelative -ErrorAction SilentlyContinue).Path
    if (-not $dockerfileAbsolute) {
        # If Resolve-Path fails, try constructing absolute path manually
        $dockerfileAbsolute = Join-Path $currentDir.Path $dockerfileRelative
        if (-not (Test-Path $dockerfileAbsolute)) {
            Write-Log "ERROR: Dockerfile not found: $dockerfileRelative" -ForegroundColor Red
            Write-Log "Current directory: $currentDir" -ForegroundColor Yellow
            Write-Log "Files in current directory:" -ForegroundColor Yellow
            Get-ChildItem -File | Select-Object -First 10 Name | ForEach-Object { 
                $fileName = $_.Name
                Write-Log "  - $fileName" -ForegroundColor Gray 
            }
            exit 1
        }
    }
    
    # Verify Dockerfile has content (not empty)
    $dockerfileInfo = Get-Item $dockerfileAbsolute -ErrorAction SilentlyContinue
    if ($dockerfileInfo -and $dockerfileInfo.Length -lt 100) {
        Write-Log "WARNING: Dockerfile appears to be very small ($($dockerfileInfo.Length) bytes). This may indicate a problem." -ForegroundColor Yellow
    }
    
    $platform = if ($UseWindows) { "windows/amd64" } else { "linux/amd64" }
    $platformName = if ($UseWindows) { "Windows AMD x64" } else { "Linux AMD x64" }
    
    Write-Log "Building Docker image for $platformName platform..." -ForegroundColor Cyan
    Write-Log "Using Dockerfile: $dockerfileRelative" -ForegroundColor Gray
    Write-Log "[DEBUG] Dockerfile absolute path: $dockerfileAbsolute" -ForegroundColor DarkGray
    Write-Log "Platform: $platform (compatible with AMD x64 and Intel x64)" -ForegroundColor Gray
    
    # Pre-build checks
    Write-Log "[DEBUG] Pre-build validation..." -ForegroundColor DarkGray
    Write-Log "[DEBUG] Dockerfile exists: $dockerfileAbsolute" -ForegroundColor DarkGray
    Write-Log "[DEBUG] Dockerfile size: $($dockerfileInfo.Length) bytes" -ForegroundColor DarkGray
    
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
    $availableGB = [math]::Round($diskSpace.Free / 1GB, 2)
    Write-Log "  Available: $availableGB GB" -ForegroundColor Gray
    
    # Note: When using --platform flag, Docker automatically sets TARGETPLATFORM build arg
    # We don't need to pass it explicitly, and we don't need it in FROM statements
    # CRITICAL: Use relative path for -f flag (relative to build context), not absolute path
    # Docker expects the Dockerfile path to be relative to the build context "."
    # The build context "." must be the directory containing the Dockerfile
    $buildArgs = @(
        "build",
        "--platform", $platform,
        "-t", $Tag,
        "-f", $dockerfileRelative,  # Use relative path, not absolute
        "--progress", "plain"  # Use plain progress for better logging
    )
    
    if ($NoCache) {
        $buildArgs += "--no-cache"
        Write-Log "[DEBUG] Building without cache" -ForegroundColor DarkGray
    }
    
    # Build context must be "." (current directory) where Dockerfile is located
    # Ensure we're in the correct directory before building
    $buildContext = $currentDir.Path
    $buildArgs += "."
    
    $buildArgsStr = $buildArgs -join ' '
    $buildStartTime = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $buildArgsCount = $buildArgs.Count
    Write-Log "Running: docker $buildArgsStr" -ForegroundColor Gray
    Write-Log "[DEBUG] Build context: $buildContext" -ForegroundColor DarkGray
    Write-Log "[DEBUG] Build context directory exists: $(Test-Path $buildContext)" -ForegroundColor DarkGray
    Write-Log "[DEBUG] Dockerfile in build context: $(Test-Path (Join-Path $buildContext $dockerfileRelative))" -ForegroundColor DarkGray
    Write-Log "[DEBUG] Build started at: $buildStartTime" -ForegroundColor DarkGray
    Write-Log "[DEBUG] Build arguments count: $buildArgsCount" -ForegroundColor DarkGray
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
    
    # Verify Dockerfile exists in build context directory
    $dockerfileInContext = Join-Path $buildContext $dockerfileRelative
    if (-not (Test-Path $dockerfileInContext)) {
        Write-Log "ERROR: Dockerfile not found in build context: $dockerfileInContext" -ForegroundColor Red
        Write-Log "Build context directory: $buildContext" -ForegroundColor Yellow
        Write-Log "Expected Dockerfile: $dockerfileRelative" -ForegroundColor Yellow
        exit 1
    }
    Write-Log "[DEBUG] Verified Dockerfile exists in build context: $dockerfileInContext" -ForegroundColor DarkGray
    
    # Capture output for detailed error analysis
    # Note: The job script will change to the build context directory before running docker build
    $result = Invoke-LoggedCommand -Command "docker" -Arguments $buildArgs -CaptureOutput
    
    # Check if build actually succeeded
    $buildSucceeded = $false
    if ($result.ExitCode -eq 0) {
        # Check if docker build actually ran (not just showing help)
        $buildOutput = $result.Output -join "`n"
        if ($buildOutput -match "Successfully built|Successfully tagged|^#\d+") {
            $buildSucceeded = $true
        } elseif ($buildOutput -match "Usage:\s+docker|Common Commands:") {
            Write-Log ""
            Write-Log "=== BUILD FAILED: Docker command executed without arguments ===" -ForegroundColor Red
            Write-Log "The docker build command appears to have been called without arguments." -ForegroundColor Red
            Write-Log "This indicates an argument passing issue in the job." -ForegroundColor Red
            $buildSucceeded = $false
        } else {
            # Build may have completed but check image exists
            Write-Log "[DEBUG] Build exit code is 0, checking if image was created..." -ForegroundColor DarkGray
            $buildSucceeded = $true
        }
    }
    
    if (-not $buildSucceeded -or $result.ExitCode -ne 0) {
        Write-Log ""
        Write-Log "=== BUILD FAILED ===" -ForegroundColor Red
        $exitCode = if ($result.ExitCode -ne 0) { $result.ExitCode } else { 1 }
        Write-Log "Exit Code: $exitCode" -ForegroundColor Red
        
        # Show last 50 lines of output for context
        Write-Log ""
        Write-Log "=== Last 50 lines of build output ===" -ForegroundColor Yellow
        $lastLines = $result.Output | Select-Object -Last 50
        $lastLines | ForEach-Object { Write-Log $_ -ForegroundColor Gray }
        
        # Show error output
        if ($result.ErrorOutput -and $result.ErrorOutput.Count -gt 0) {
            Write-Log ""
            Write-Log "=== Error output ===" -ForegroundColor Red
            $result.ErrorOutput | ForEach-Object { Write-Log $_ -ForegroundColor Red }
        }
        
        # Show last 20 lines from log file
        Write-Log ""
        Write-Log "=== Last 20 lines from log file ===" -ForegroundColor Yellow
        if (Test-Path $LogFile) {
            Get-Content $LogFile -Tail 20 | ForEach-Object { Write-Log $_ -ForegroundColor Gray }
        }
        
        # Common issues and suggestions
        Write-Log ""
        Write-Log "=== Troubleshooting suggestions ===" -ForegroundColor Cyan
        Write-Log "1. Check Docker daemon is running: docker info" -ForegroundColor Gray
        Write-Log "2. Check disk space: docker system df" -ForegroundColor Gray
        Write-Log "3. Check Dockerfile syntax: docker build --dry-run ..." -ForegroundColor Gray
        Write-Log "4. Check network connectivity (for apt/package downloads)" -ForegroundColor Gray
        Write-Log "5. Review full log: Get-Content $LogFile -Tail 100" -ForegroundColor Gray
        $cleanCmd = '.\\build-docker.ps1 cleanall'
        $cleanMsg = '6. Try cleaning Docker: ' + $cleanCmd
        Write-Log $cleanMsg -ForegroundColor Gray
        
        Write-Log ""
        Write-Log "Full build output has been logged to: $LogFile" -ForegroundColor Yellow
        exit $exitCode
    }
    
    $buildEndTime = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Write-Log "[DEBUG] Build completed at: $buildEndTime" -ForegroundColor DarkGray
    Write-Log "Build completed successfully!" -ForegroundColor Green
    
    # Verify image was created
    Write-Log "[DEBUG] Verifying image creation..." -ForegroundColor DarkGray
    $imageCheck = docker images $Tag --format "{{.Repository}}:{{.Tag}}" 2>&1
    if ($imageCheck -and $imageCheck -like "*$Tag*" -and -not ($imageCheck -match "Error|error")) {
        Write-Log "Image verified: $Tag" -ForegroundColor Green
        docker images $Tag --format "  Size: {{.Size}}, Created: {{.CreatedAt}}" | ForEach-Object { Write-Log $_ -ForegroundColor Gray }
    } else {
        Write-Log "ERROR: Image verification failed. Image '$Tag' was not created." -ForegroundColor Red
        Write-Log "This indicates the build did not complete successfully despite exit code 0." -ForegroundColor Red
        Write-Log "Checking available images..." -ForegroundColor Yellow
        docker images | Select-Object -First 10 | ForEach-Object { Write-Log $_ -ForegroundColor Gray }
        exit 1
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
    
    $runArgsStr = $runArgs -join ' '
    Write-Log "Executing: docker $runArgsStr" -ForegroundColor Cyan
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
        # Build log entries using concatenation to avoid string interpolation issues
        # Use variables for replacement strings to avoid quote parsing issues
        # Construct double quote using char code to avoid parsing issues
        $doubleQuote = [char]34
        $doubleDoubleQuote = [char]34 + [char]34
        $commandStr = ($runArgs -join ' ') -replace [regex]::Escape($doubleQuote), $doubleDoubleQuote
        $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        $newline = [Environment]::NewLine
        $logEntry = '[' + $timestamp + '] Executed interactive docker command: docker ' + $commandStr + $newline
        $logEntry += '[' + $timestamp + '] Container exited with code: ' + $exitCode + $newline
        Add-Content -Path $LogFile -Value $logEntry
        
        if ($exitCode -ne 0) {
            Write-Log "Container exited with non-zero code: $exitCode" -ForegroundColor Yellow
        }
    } catch {
        # Safely escape exception message to avoid quote issues
        # Build log entries using concatenation to avoid string interpolation issues
        # Use variables for replacement strings to avoid quote parsing issues
        # Construct double quote using char code to avoid parsing issues
        $doubleQuote = [char]34
        $doubleDoubleQuote = [char]34 + [char]34
        $exceptionMsgRaw = $_.Exception.Message
        $exceptionMsg = $exceptionMsgRaw -replace [regex]::Escape($doubleQuote), $doubleDoubleQuote
        Write-Log "ERROR: Failed to run container interactively: $exceptionMsg" -ForegroundColor Red
        $exceptionDetails = $_.Exception | Format-List -Force | Out-String
        Write-Log "Exception details: $exceptionDetails" -ForegroundColor DarkGray
        $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        $newline = [Environment]::NewLine
        $logEntry = '[' + $timestamp + '] ERROR: Failed to run container: ' + $exceptionMsg + $newline
        Add-Content -Path $LogFile -Value $logEntry
        exit 1
    }
}

function Start-DevContainer {
    Write-Log "Starting development container..." -ForegroundColor Cyan
    
    # Ensure we're in the correct directory (where docker-compose.yml is located)
    # Docker-compose needs to be run from the directory containing docker-compose.yml
    $composeFile = "docker-compose.yml"
    $currentDir = Get-Location
    $composeFilePath = Join-Path $currentDir.Path $composeFile
    
    if (-not (Test-Path $composeFilePath)) {
        Write-Log "ERROR: docker-compose.yml not found in current directory: $currentDir" -ForegroundColor Red
        Write-Log "Current directory: $currentDir" -ForegroundColor Yellow
        Write-Log "Expected file: $composeFilePath" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Log "[DEBUG] docker-compose.yml found: $composeFilePath" -ForegroundColor DarkGray
    Write-Log "[DEBUG] Running docker-compose from directory: $currentDir" -ForegroundColor DarkGray
    
    # Use CaptureOutput to properly handle docker-compose output and get exit code
    # docker-compose writes normal output to STDERR, so we need to check exit code, not just STDERR
    # CRITICAL: docker-compose must be run from the directory containing docker-compose.yml
    # When paths contain spaces, we need to ensure we're in the correct directory
    # Pass the working directory to Invoke-LoggedCommand so Start-Process uses it
    try {
        $result = Invoke-LoggedCommand -Command "docker-compose" -Arguments @("up", "-d", "dev") -CaptureOutput -WorkingDirectory $currentDir.Path
        
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
            $resultType = $result.GetType().FullName
            Write-Log "ERROR: Result object missing ExitCode property. Result type: $resultType" -ForegroundColor Red
            if ($result -is [hashtable]) {
                $hashtableKeys = $result.Keys -join ', '
                Write-Log "Hashtable keys: $hashtableKeys" -ForegroundColor Yellow
            } else {
                $resultProps = $result.PSObject.Properties.Name -join ', '
                Write-Log "Result properties: $resultProps" -ForegroundColor Yellow
            }
            $resultJson = $result | ConvertTo-Json -Depth 3
            Write-Log "Result content: $resultJson" -ForegroundColor Yellow
            exit 1
        }
        
        $exitCode = $result.ExitCode
        
        Write-Log "[DEBUG] docker-compose exit code: $exitCode" -ForegroundColor DarkGray
        $resultType = $result.GetType().FullName
        Write-Log "[DEBUG] Result type: $resultType" -ForegroundColor DarkGray
        
        # Show custom properties (for hashtables, use .Keys; for PSCustomObject, use Properties)
        if ($result -is [hashtable]) {
            $resultKeys = $result.Keys -join ', '
            $resultExitCode = $result.ExitCode
            Write-Log "[DEBUG] Result keys: $resultKeys" -ForegroundColor DarkGray
            Write-Log "[DEBUG] ExitCode value: $resultExitCode" -ForegroundColor DarkGray
            
            # For docker-compose, output often goes to ErrorOutput (stderr) not Output (stdout)
            $outputCount = if ($result.Output) { $result.Output.Count } else { 0 }
            $errorOutputCount = if ($result.ErrorOutput) { $result.ErrorOutput.Count } else { 0 }
            Write-Log "[DEBUG] Output lines: $outputCount, ErrorOutput lines: $errorOutputCount" -ForegroundColor DarkGray
            
            # Show first few lines of ErrorOutput if present (docker-compose writes to stderr)
            if ($errorOutputCount -gt 0 -and $result.ErrorOutput) {
                $previewLines = [Math]::Min(3, $errorOutputCount)
                Write-Log "[DEBUG] ErrorOutput preview (first $previewLines lines):" -ForegroundColor DarkGray
                for ($i = 0; $i -lt $previewLines; $i++) {
                    $errorLine = $result.ErrorOutput[$i]
                    Write-Log "[DEBUG]   [$i]: $errorLine" -ForegroundColor DarkGray
                }
            }
            
            # Show first few lines of Output if present
            if ($outputCount -gt 0 -and $result.Output) {
                $previewLines = [Math]::Min(3, $outputCount)
                Write-Log "[DEBUG] Output preview (first $previewLines lines):" -ForegroundColor DarkGray
                for ($i = 0; $i -lt $previewLines; $i++) {
                    $outputLine = $result.Output[$i]
                    Write-Log "[DEBUG]   [$i]: $outputLine" -ForegroundColor DarkGray
                }
            }
        } else {
            $resultProps = $result.PSObject.Properties.Name -join ', '
            Write-Log "[DEBUG] Result properties: $resultProps" -ForegroundColor DarkGray
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
            $testCompileCmd = '.\\build-docker.ps1 test-compile'
            $testCompileMsg = '  ' + $testCompileCmd
            Write-Log $testCompileMsg -ForegroundColor Gray
            Write-Log ""
            Write-Log "[DEBUG] Checking container logs for any startup errors..." -ForegroundColor DarkGray
            $logsResult = Invoke-LoggedCommand -Command "docker-compose" -Arguments @("logs", "--tail=20", "dev") -CaptureOutput -WorkingDirectory $currentDir.Path
            if ($logsResult.ExitCode -eq 0 -and $logsResult.Output) {
                $errorPattern = "ERROR|error|WARNING|warning"
                $errorLines = $logsResult.Output | Where-Object { $_ -match $errorPattern }
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
        $exceptionMsg = $_.Exception.Message
        $exceptionType = $_.Exception.GetType().FullName
        $stackTrace = $_.ScriptStackTrace
        Write-Log "ERROR: Exception in Start-DevContainer: $exceptionMsg" -ForegroundColor Red
        Write-Log "Exception type: $exceptionType" -ForegroundColor Red
        Write-Log "Stack trace: $stackTrace" -ForegroundColor Yellow
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
    
    $distPathOriginal = (Resolve-Path 'dist').Path
    $scriptPathOriginal = (Resolve-Path 'docker-package.sh').Path
    Write-Log "[DEBUG] Dist path (original): $distPathOriginal" -ForegroundColor DarkGray
    Write-Log "[DEBUG] Dist path (converted): $distPathRaw" -ForegroundColor DarkGray
    Write-Log "[DEBUG] Script path (original): $scriptPathOriginal" -ForegroundColor DarkGray
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
    
    $packageArgsStr = $packageArgs -join ' '
    Write-Log "[DEBUG] Package arguments: $packageArgsStr" -ForegroundColor DarkGray
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
    $testMsg = "Testing npm run compile in dev container..."
    Write-Log $testMsg -ForegroundColor Cyan
    
    try {
        Write-Log "[DEBUG] Checking if dev container is running..." -ForegroundColor DarkGray
        $containerCheck = Invoke-LoggedCommand -Command "docker-compose" -Arguments @("ps", "-q", "dev") -CaptureOutput
        if (-not $containerCheck.Output -or $containerCheck.Output.Count -eq 0) {
            $startCmd = '.\\build-docker.ps1 dev'
            $errorMsg = 'ERROR: Dev container is not running. Start it first with: ' + $startCmd
            Write-Log $errorMsg -ForegroundColor Red
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
  echo "[OK] node_modules directory exists"
  echo "  Size: $(du -sh /app/node_modules | cut -f1)"
  echo "  File count: $(find /app/node_modules -type f | wc -l)"
else
  echo "[FAIL] ERROR: node_modules directory missing"
fi
echo ""
echo "4. Checking TypeScript compiler:"
if [ -f "/app/node_modules/.bin/tsc" ]; then
  echo "[OK] tsc found at: /app/node_modules/.bin/tsc"
  /app/node_modules/.bin/tsc --version 2>&1 || echo "ERROR: tsc version check failed"
else
  echo "[FAIL] ERROR: tsc not found in node_modules/.bin"
  echo "  Checking for typescript package..."
  if [ -d "/app/node_modules/typescript" ]; then
    echo "  [OK] typescript package exists"
    ls -la /app/node_modules/typescript/bin/ 2>&1 || echo "  ERROR: typescript/bin directory missing"
  else
    echo "  [FAIL] ERROR: typescript package missing"
  fi
fi
echo ""
echo "5. Checking config files:"
[ -f "/app/tsconfig.json" ] && echo "[OK] tsconfig.json exists" || echo "[FAIL] ERROR: tsconfig.json missing"
[ -f "/app/package.json" ] && echo "[OK] package.json exists" || echo "[FAIL] ERROR: package.json missing"
echo ""
echo "6. Checking source directory:"
[ -d "/app/src" ] && echo "[OK] src directory exists ($(find /app/src -name '*.ts' | wc -l) TypeScript files)" || echo "[FAIL] ERROR: src directory missing"
echo ""
echo "7. Checking out directory:"
[ -d "/app/out" ] && echo "[OK] out directory exists (writable)" || echo "[WARNING] WARNING: out directory missing (will be created)"
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
            $diagnosticsExitCode = $diagnosticsResult.ExitCode
            Write-Log "WARNING: Diagnostics command failed with exit code $diagnosticsExitCode" -ForegroundColor Yellow
            if ($diagnosticsResult.ErrorOutput) {
                $diagnosticsResult.ErrorOutput | ForEach-Object { Write-Log "  $_" -ForegroundColor Yellow }
            }
        }
        
        Write-Log ""
        Write-Log "Attempting npm run compile..." -ForegroundColor Yellow
        
        # Run npm compile with detailed error capture
        # Use here-string to avoid parsing issues with special characters in bash command
        $compileCmd = @'
set -e
cd /app
npm run compile 2>&1
'@
        $compileResult = Invoke-LoggedCommand -Command "docker-compose" -Arguments @("exec", "-T", "dev", "bash", "-c", $compileCmd) -CaptureOutput
        
        if ($compileResult.ExitCode -eq 0) {
            $successMsg = "SUCCESS: npm run compile succeeded!"
            Write-Log $successMsg -ForegroundColor Green
            if ($compileResult.Output) {
                Write-Log "Compile output:" -ForegroundColor Gray
                $compileResult.Output | Select-Object -Last 20 | ForEach-Object { Write-Log "  $_" -ForegroundColor Gray }
            }
            return $true
        } else {
            $compileExitCode = $compileResult.ExitCode
            $failMsg = "npm run compile FAILED with exit code $compileExitCode"
            Write-Log $failMsg -ForegroundColor Red
            Write-Log ""
            $errorDetailsHeader = "=== COMPILE ERROR DETAILS ==="
            Write-Log $errorDetailsHeader -ForegroundColor Red
            
            if ($compileResult.ErrorOutput) {
                Write-Log "Error output (stderr):" -ForegroundColor Red
                $compileResult.ErrorOutput | ForEach-Object { Write-Log "  $_" -ForegroundColor Red }
            }
            
            if ($compileResult.Output) {
                Write-Log "Standard output (stdout):" -ForegroundColor Yellow
                $compileResult.Output | ForEach-Object { Write-Log "  $_" -ForegroundColor Yellow }
            }
            
            Write-Log ""
            $troubleshootingHeader = "=== TROUBLESHOOTING SUGGESTIONS ==="
            Write-Log $troubleshootingHeader -ForegroundColor Yellow
            Write-Log "1. Check if TypeScript is installed: docker-compose exec dev npm list typescript" -ForegroundColor Gray
            Write-Log "2. Check if node_modules is complete: docker-compose exec dev ls -la /app/node_modules/.bin/ | grep tsc" -ForegroundColor Gray
            Write-Log "3. Try reinstalling dependencies: docker-compose exec dev npm ci" -ForegroundColor Gray
            Write-Log "4. Check tsconfig.json: docker-compose exec dev cat /app/tsconfig.json" -ForegroundColor Gray
            Write-Log "5. Check for TypeScript errors: docker-compose exec dev npx tsc --noEmit" -ForegroundColor Gray
            
            return $false
        }
    } catch {
        $exceptionMsg = $_.Exception.Message
        $exceptionType = $_.Exception.GetType().FullName
        $stackTrace = $_.ScriptStackTrace
        Write-Log "ERROR: Exception in Test-NpmCompile: $exceptionMsg" -ForegroundColor Red
        Write-Log "Exception type: $exceptionType" -ForegroundColor Red
        Write-Log "Stack trace: $stackTrace" -ForegroundColor Yellow
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
    
    # Build test command for sh -c
    # The argument processor will handle quoting automatically
    $testArgs = @(
        "run", "--rm",
        "-v", "${srcPath}:/app/src:ro",
        "-v", "${testsPath}:/app/tests:ro",
        "-w", "/app",
        $Tag,
        "sh", "-c", "npm test"
    )
    
    $testArgsStr = $testArgs -join ' '
    Write-Log "[DEBUG] Running: docker $testArgsStr" -ForegroundColor DarkGray
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
        $testCompileCmd = '.\\build-docker.ps1 test-compile'
        $testCompileMsg = 'If compilation failed, run: ' + $testCompileCmd
        Write-Log $testCompileMsg -ForegroundColor Gray
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
    $rebuildCmd = '.\\build-docker.ps1 build -NoCache'
    $rebuildMsg = 'Run ''' + $rebuildCmd + ''' for fresh build'
    Write-Log $rebuildMsg -ForegroundColor Yellow
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
                $devCmd = '.\\build-docker.ps1 dev'
                $devErrorMsg = 'ERROR: docker-compose.yml not found. Run ''' + $devCmd + ''' first to start the dev container.'
                Write-Log $devErrorMsg -ForegroundColor Red
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
    $successHeader = "=== Script completed successfully ==="
    Write-Log $successHeader -ForegroundColor Green
} catch {
    $errorHeader = "=== Script failed with error ==="
    Write-Log $errorHeader -ForegroundColor Red
    $exceptionMsg = $_.Exception.Message
    $stackTrace = $_.ScriptStackTrace
    Write-Log $exceptionMsg -ForegroundColor Red
    Write-Log $stackTrace -ForegroundColor Red
    
    # Safely escape strings for logging to avoid quote issues
    # Build log entries using concatenation to avoid string interpolation issues
    $errorMsgRaw = $_.Exception.Message
    $stackTraceRaw = $_.ScriptStackTrace
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    
    # Use a variable for replacement string to avoid quote parsing issues
    # Construct double quote using char code to avoid parsing issues
    $doubleQuote = [char]34
    $doubleDoubleQuote = [char]34 + [char]34
    
    # Build log entries using string concatenation instead of interpolation
    # This prevents PowerShell from trying to parse special characters in the variables
    $errorMsgEscaped = $errorMsgRaw -replace [regex]::Escape($doubleQuote), $doubleDoubleQuote
    $stackTraceEscaped = $stackTraceRaw -replace [regex]::Escape($doubleQuote), $doubleDoubleQuote
    $errorLogEntry = '[' + $timestamp + '] ERROR: ' + $errorMsgEscaped
    $stackTraceLogEntry = '[' + $timestamp + '] STACKTRACE: ' + $stackTraceEscaped
    
    Add-Content -Path $LogFile -Value $errorLogEntry -ErrorAction SilentlyContinue
    Add-Content -Path $LogFile -Value $stackTraceLogEntry -ErrorAction SilentlyContinue
    exit 1
}


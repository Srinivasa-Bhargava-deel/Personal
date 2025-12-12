# How to Check if AMD-V/SVM is Enabled on Windows PC using CMD

Quick reference guide for checking virtualization status using Windows Command Prompt (CMD).

## Method 1: Using systeminfo (Easiest)

```cmd
systeminfo | findstr /C:"Hyper-V"
```

**Expected Output if Virtualization is Enabled:**
```
Hyper-V Requirements: A hypervisor has been detected. Features required for Hyper-V will not be displayed.
```

**Expected Output if Virtualization is Disabled:**
```
Hyper-V Requirements: VM Monitor Mode Extensions: Yes
                      Virtualization Enabled In Firmware: No
                      Second Level Address Translation: Yes
                      Data Execution Prevention Available: Yes
```

**Key Indicator:**
- ✅ **"A hypervisor has been detected"** = Virtualization is enabled
- ❌ **"Virtualization Enabled In Firmware: No"** = Virtualization is disabled in BIOS/UEFI

## Method 2: Using systeminfo (Full Details)

```cmd
systeminfo | findstr /C:"Virtualization"
```

**Expected Output:**
```
Hyper-V Requirements: VM Monitor Mode Extensions: Yes
                      Virtualization Enabled In Firmware: Yes/No
                      Second Level Address Translation: Yes
                      Data Execution Prevention Available: Yes
```

**Key Field:**
- **"Virtualization Enabled In Firmware: Yes"** = ✅ Enabled
- **"Virtualization Enabled In Firmware: No"** = ❌ Disabled

## Method 3: Using WMIC (Windows Management Instrumentation)

```cmd
wmic cpu get VirtualizationFirmwareEnabled
```

**Expected Output:**
```
VirtualizationFirmwareEnabled
TRUE
```

**Interpretation:**
- **TRUE** = ✅ Virtualization is enabled
- **FALSE** = ❌ Virtualization is disabled

## Method 4: Check Processor Capabilities

```cmd
wmic cpu get Name,VirtualizationFirmwareEnabled,SecondLevelAddressTranslationExtensions
```

**Expected Output:**
```
Name                                    VirtualizationFirmwareEnabled  SecondLevelAddressTranslationExtensions
AMD Ryzen 7 5800X 8-Core Processor     TRUE                            TRUE
```

**Key Fields:**
- **VirtualizationFirmwareEnabled: TRUE** = ✅ Enabled
- **SecondLevelAddressTranslationExtensions: TRUE** = ✅ SLAT supported (required for WSL2/Docker)

## Method 5: Check Hyper-V Status

```cmd
systeminfo | findstr /C:"Hyper-V" /C:"VM Monitor"
```

**Expected Output:**
```
Hyper-V Requirements: VM Monitor Mode Extensions: Yes
                      A hypervisor has been detected.
```

**Key Indicators:**
- **"VM Monitor Mode Extensions: Yes"** = CPU supports virtualization
- **"A hypervisor has been detected"** = Virtualization is active

## Method 6: Using PowerShell (If Available in CMD)

```cmd
powershell -Command "Get-ComputerInfo | Select-Object HyperV*"
```

**Expected Output:**
```
HyperVRequirementVirtualizationFirmwareEnabled : True
HyperVRequirementSecondLevelAddressTranslation : True
```

## Quick One-Liner Check

```cmd
systeminfo | findstr /C:"Virtualization Enabled In Firmware"
```

**Output:**
- ✅ **"Virtualization Enabled In Firmware: Yes"** = Enabled
- ❌ **"Virtualization Enabled In Firmware: No"** = Disabled

## Complete Check Script

Save this as `check_virtualization.cmd`:

```cmd
@echo off
echo ========================================
echo Virtualization Status Check
echo ========================================
echo.

echo Checking virtualization status...
echo.

systeminfo | findstr /C:"Virtualization Enabled In Firmware"
echo.

wmic cpu get VirtualizationFirmwareEnabled
echo.

echo ========================================
echo If "Virtualization Enabled In Firmware: Yes" or "TRUE" = Virtualization is ENABLED
echo If "Virtualization Enabled In Firmware: No" or "FALSE" = Virtualization is DISABLED
echo ========================================
pause
```

## For AMD Processors Specifically

### Check AMD-V/SVM Support

```cmd
wmic cpu get Name,VirtualizationFirmwareEnabled
```

**For AMD Ryzen/EPYC processors:**
- If **VirtualizationFirmwareEnabled: TRUE** = AMD-V/SVM is enabled
- If **VirtualizationFirmwareEnabled: FALSE** = AMD-V/SVM is disabled (need to enable in BIOS)

### Check Processor Model

```cmd
wmic cpu get Name
```

**Expected Output:**
```
Name
AMD Ryzen 7 5800X 8-Core Processor
```

This confirms you have an AMD processor that supports AMD-V/SVM.

## Troubleshooting

### If Virtualization Shows as Disabled

**Enable AMD-V/SVM in BIOS/UEFI:**

1. **Restart computer** and enter BIOS/UEFI:
   - **AMD**: Usually **F2**, **F10**, or **Del** during boot
   - Look for boot message: "Press [key] to enter Setup"

2. **Navigate to CPU Settings:**
   - **Advanced** → **CPU Configuration**
   - Or **Advanced** → **Processor Configuration**

3. **Enable SVM (AMD Virtualization):**
   - Find: **"SVM Mode"** or **"AMD-V"** or **"Virtualization"**
   - Set to: **Enabled**
   - Save and exit (usually **F10**)

4. **Verify After Restart:**
   ```cmd
   systeminfo | findstr /C:"Virtualization Enabled In Firmware"
   ```
   Should now show: **"Virtualization Enabled In Firmware: Yes"**

### Common BIOS/UEFI Locations

**For AMD Processors:**
- **ASUS**: Advanced → CPU Configuration → SVM Mode
- **MSI**: OC → CPU Features → SVM Mode
- **Gigabyte**: Advanced → CPU Configuration → SVM Mode
- **ASRock**: Advanced → CPU Configuration → SVM Mode
- **HP/Dell**: Security → Virtualization → Enable

## Verification Checklist

After enabling virtualization, verify:

```cmd
REM 1. Check virtualization status
systeminfo | findstr /C:"Virtualization Enabled In Firmware"

REM 2. Check hypervisor detection
systeminfo | findstr /C:"Hyper-V"

REM 3. Check WMIC status
wmic cpu get VirtualizationFirmwareEnabled

REM 4. Verify Docker can use it
docker info | findstr /C:"Kernel Version"
```

## Summary

**Quickest Check:**
```cmd
systeminfo | findstr /C:"Virtualization Enabled In Firmware"
```

**Most Reliable:**
```cmd
wmic cpu get VirtualizationFirmwareEnabled
```

**Expected Results:**
- ✅ **"Yes"** or **"TRUE"** = Virtualization enabled (ready for Docker/WSL2)
- ❌ **"No"** or **"FALSE"** = Virtualization disabled (enable in BIOS)

---

**Note**: After enabling virtualization in BIOS, you may need to restart Windows for the changes to take effect.





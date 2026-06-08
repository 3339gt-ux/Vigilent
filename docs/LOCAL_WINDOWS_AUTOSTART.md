# Vygilence Local Windows Server Autostart & Management

This guide explains how to set up, manage, and troubleshoot the local Vygilence application on Windows.
The setup includes scripts for manual start, production builds, stopping active port processes, status checking, and automatic startup using the Windows Task Scheduler.

---

## 1. Overview of the Setup

This configuration allows the Vygilence server to run locally on port **3000**.
* **Development Server**: Runs `npm run dev` directly. Suitable for making code edits, features hot-reload, but is slower and not optimized for demos.
* **Production Server**: Runs `npm run build` to compile code, then `npm run start` to host the optimized build. Best for performance, stability, and demo readiness.

All execution output, errors, and access history are captured into local logs inside `C:\Vigilen\logs\`.

---

## 2. Log File Locations

Logs are stored locally and are git-ignored to prevent committing raw data:
* **Production Server Log**: `C:\Vigilen\logs\vygilence-server.log`
* **Development Server Log**: `C:\Vigilen\logs\vygilence-dev-server.log`
* **Build Log**: `C:\Vigilen\logs\vygilence-build.log`

---

## 3. Manual Server Operations

### 3.1. Build the Production Application
Run this script to compile the latest code modifications:
```cmd
C:\Vigilen\scripts\windows\build-vygilence.cmd
```

### 3.2. Start the Production Server Manually
To start the production server manually (attaches output to `logs/vygilence-server.log`):
```cmd
C:\Vigilen\scripts\windows\start-vygilence-prod.cmd
```

### 3.3. Start the Development Server Manually
To run the hot-reloading dev environment (attaches output to `logs/vygilence-dev-server.log`):
```cmd
C:\Vigilen\scripts\windows\start-vygilence-dev.cmd
```

---

## 4. PowerShell Operations

> [!IMPORTANT]
> Since PowerShell defaults to restricted script execution, you may need to append `-ExecutionPolicy Bypass` when executing these scripts from an external terminal.

### 4.1. Check Server Status
Check if port 3000 is listening and if the Vygilence app is actively responding to requests:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Vigilen\scripts\windows\check-vygilence-status.ps1
```

### 4.2. Stop the Server (Free Port 3000)
Find and terminate any process (such as a stray Node/Next.js instance) listening on port 3000. It shows the PID and process name and prompts for confirmation:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Vigilen\scripts\windows\stop-vygilence-port-3000.ps1
```
*To force-kill the process without confirmation, pass the `-Force` parameter:*
```powershell
powershell -ExecutionPolicy Bypass -File C:\Vigilen\scripts\windows\stop-vygilence-port-3000.ps1 -Force
```

### 4.3. Safe Restart
Clears any process on port 3000 and restarts the server (via Task Scheduler if installed, or via minimized window if not):
```powershell
powershell -ExecutionPolicy Bypass -File C:\Vigilen\scripts\windows\restart-vygilence-local.ps1
```

---

## 5. Configuring Windows Task Scheduler Auto-Start

### 5.1. Install Autostart (On Logon)
Creates a Windows Scheduled Task named **`Vygilence Local Server`** that triggers automatically when the user logs in. This runs under the user's normal credentials without requiring admin privileges:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Vigilen\scripts\windows\install-vygilence-autostart.ps1
```

### 5.2. Install Autostart (On Boot / System Startup)
To make the application start immediately when the PC boots (before any user logs in), run the installer with the `startup` trigger. **This requires running PowerShell as Administrator**:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Vigilen\scripts\windows\install-vygilence-autostart.ps1 -Trigger startup
```

### 5.3. Uninstall Autostart Task
Removes the `Vygilence Local Server` Scheduled Task from Task Scheduler:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Vigilen\scripts\windows\uninstall-vygilence-autostart.ps1
```

---

## 6. Troubleshooting & Limitations

### 6.1. Port 3000 Already in Use
* **Symptom**: Next.js fails to start or says "port 3000 in use".
* **Solution**: Run the stop script: `stop-vygilence-port-3000.ps1` to terminate the blocker.

### 6.2. Missing node_modules
* **Symptom**: Node module import errors or "next command not found".
* **Solution**: Ensure dependencies are installed by running `npm install` inside `C:\Vigilen` before running the scripts.

### 6.3. Windows Script Blocked (Execution Policy)
* **Symptom**: "script.ps1 cannot be loaded because running scripts is disabled on this system".
* **Solution**: Ensure you append `-ExecutionPolicy Bypass` to bypass execution rules for the session.

### 6.4. Supabase or Database Issues
* **Symptom**: Server starts but shows database errors, or onboarding fails.
* **Solution**: Ensure `.env.local` is present in `C:\Vigilen` and holds correct Supabase config endpoints. Verify your network connection is active.

### 6.5. PC Asleep, Hibernate, or Offline
* **Symptom**: Port 3000 is unreachable after leaving the PC.
* **Limitation**: Task Scheduler cannot keep the app running if the PC is powered off, asleep, or in hibernation. Configure Windows Power & Sleep settings to "Never sleep" when plugged in if constant availability is required.

### 6.6. Local Host vs Cloud Availability
* **Limitation**: This setup hosts Vygilence only on Graham's local computer. It is designed for development and local testing. For production deployments or external team access, Vygilence should be deployed to a standard cloud provider (e.g., Vercel, AWS, or GCP) with centralized environment variables.

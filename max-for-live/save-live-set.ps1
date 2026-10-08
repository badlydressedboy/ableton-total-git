param([int]$DeviceNodePid, [switch]$Watch)
$ErrorActionPreference = 'Stop'
try {
    # Prefer the Live instance owning this Node/Max process. With no ancestry
    # match, require a single Live window rather than guessing between Sets.
    $taskProcesses = @(Get-CimInstance Win32_Process)
    $taskLiveWindows = @(Get-Process | Where-Object { $_.ProcessName -like 'Ableton Live*' -and $_.MainWindowHandle -ne [IntPtr]::Zero })
    $taskAncestor = $DeviceNodePid
    $taskTarget = $null
    $taskVisited = @{}
    while ($taskAncestor -gt 0 -and -not $taskVisited.ContainsKey($taskAncestor)) {
        $taskVisited[$taskAncestor] = $true
        $taskTarget = $taskLiveWindows | Where-Object Id -eq $taskAncestor | Select-Object -First 1
        if ($taskTarget) { break }
        $taskParent = $taskProcesses | Where-Object ProcessId -eq $taskAncestor | Select-Object -First 1
        if (-not $taskParent) { break }
        $taskAncestor = [int]$taskParent.ParentProcessId
    }
    if (-not $taskTarget) {
        if ($taskLiveWindows.Count -ne 1) { throw 'Open one Ableton Live window to use Save Live Set.' }
        $taskTarget = $taskLiveWindows[0]
    }
    Add-Type -Path (Join-Path $PSScriptRoot 'save-live-set.windows.cs')
    [AbletonSetSave]::CompleteLaunchFeedback()
    if ($Watch) {
        $taskLastState = ''
        while (-not $taskTarget.HasExited) {
            $taskTarget.Refresh()
            $taskState = @{ title = $taskTarget.MainWindowTitle; available = [AbletonSetSave]::WindowAvailable($taskTarget.MainWindowHandle) } | ConvertTo-Json -Compress
            if ($taskState -ne $taskLastState) { [Console]::Out.WriteLine($taskState); $taskLastState = $taskState }
            Start-Sleep -Milliseconds 500
        }
        exit 0
    }
    [AbletonSetSave]::Save($taskTarget.MainWindowHandle)
    exit 0
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
}

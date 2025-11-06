# TestSprite Progress Monitor
# Run this script to monitor test execution progress

$lockFile = "testsprite_tests\tmp\execution.lock"
$tmpDir = "testsprite_tests\tmp"
$reportFile = "testsprite_tests\tmp\raw_report.md"
$finalReport = "testsprite_tests\testsprite-mcp-test-report.md"

Write-Host "`n🔍 TestSprite Progress Monitor`n" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop monitoring`n" -ForegroundColor Gray

while ($true) {
    Clear-Host
    Write-Host "`n🔍 TestSprite Progress Monitor`n" -ForegroundColor Cyan
    Write-Host "=" * 50
    
    # Check if process is running
    if (Test-Path $lockFile) {
        $lock = Get-Content $lockFile | ConvertFrom-Json
        $process = Get-Process -Id $lock.pid -ErrorAction SilentlyContinue
        
        if ($process) {
            $runtime = (Get-Date) - $process.StartTime
            Write-Host "`n✅ Test Execution Status: RUNNING" -ForegroundColor Green
            Write-Host "   Process ID: $($lock.pid)"
            Write-Host "   Started: $($process.StartTime)"
            Write-Host "   Runtime: $($runtime.ToString('mm\:ss'))"
            Write-Host "   CPU Usage: $([math]::Round($process.CPU, 2)) seconds"
            Write-Host "   Memory: $([math]::Round($process.WorkingSet / 1MB, 2)) MB"
        } else {
            Write-Host "`n⚠️  Process ended but lock file exists" -ForegroundColor Yellow
        }
    } else {
        Write-Host "`n❌ No active test execution found" -ForegroundColor Red
    }
    
    # Check for result files
    Write-Host "`n📊 Result Files:" -ForegroundColor Cyan
    if (Test-Path $reportFile) {
        $reportAge = (Get-Date) - (Get-Item $reportFile).LastWriteTime
        Write-Host "   ✅ Raw Report: EXISTS (updated $($reportAge.ToString('mm\:ss')) ago)" -ForegroundColor Green
        $reportLines = (Get-Content $reportFile | Measure-Object -Line).Lines
        Write-Host "      Lines: $reportLines"
    } else {
        Write-Host "   ⏳ Raw Report: Not yet generated" -ForegroundColor Yellow
    }
    
    if (Test-Path $finalReport) {
        Write-Host "   ✅ Final Report: EXISTS" -ForegroundColor Green
    } else {
        Write-Host "   ⏳ Final Report: Not yet generated" -ForegroundColor Yellow
    }
    
    # Check tmp directory for new files
    Write-Host "`n📁 Recent Files:" -ForegroundColor Cyan
    $recentFiles = Get-ChildItem -Path $tmpDir -Recurse -File | 
        Where-Object { $_.LastWriteTime -gt (Get-Date).AddMinutes(-5) } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 5
    
    if ($recentFiles) {
        foreach ($file in $recentFiles) {
            $age = (Get-Date) - $file.LastWriteTime
            Write-Host "   • $($file.Name) ($($age.ToString('mm\:ss')) ago)" -ForegroundColor Gray
        }
    } else {
        Write-Host "   (No recent activity)" -ForegroundColor Gray
    }
    
    Write-Host "`n" + ("=" * 50)
    Write-Host "`nRefreshing in 5 seconds... (Ctrl+C to stop)`n" -ForegroundColor Gray
    
    Start-Sleep -Seconds 5
}


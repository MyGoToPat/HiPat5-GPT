# TestSprite Progress Monitor - 30 second intervals
$checkCount = 0

while ($true) {
    $checkCount++
    Clear-Host
    Write-Host "`n🔍 TestSprite Progress Monitor - Check #$checkCount`n" -ForegroundColor Cyan
    Write-Host ("=" * 60)
    
    $lockFile = "testsprite_tests\tmp\execution.lock"
    
    if (Test-Path $lockFile) {
        $lock = Get-Content $lockFile | ConvertFrom-Json
        $proc = Get-Process -Id $lock.pid -ErrorAction SilentlyContinue
        
        if ($proc) {
            $runtime = (Get-Date) - $proc.StartTime
            Write-Host "`n✅ Status: RUNNING" -ForegroundColor Green
            Write-Host "   PID: $($lock.pid)"
            Write-Host "   Started: $($proc.StartTime)"
            Write-Host "   Runtime: $($runtime.Minutes)m $($runtime.Seconds)s"
            Write-Host "   CPU Time: $([math]::Round($proc.CPU, 2))s"
            Write-Host "   Memory: $([math]::Round($proc.WorkingSet / 1MB, 2)) MB"
        } else {
            Write-Host "`n⚠️  Process ended (lock file still exists)" -ForegroundColor Yellow
            break
        }
    } else {
        Write-Host "`n✅ No lock file - Tests may have completed!" -ForegroundColor Green
        break
    }
    
    Write-Host "`n📊 Result Files:" -ForegroundColor Cyan
    $rawReport = "testsprite_tests\tmp\raw_report.md"
    $finalReport = "testsprite_tests\testsprite-mcp-test-report.md"
    
    if (Test-Path $rawReport) {
        $age = (Get-Date) - (Get-Item $rawReport).LastWriteTime
        Write-Host "   ✅ Raw Report: EXISTS (updated $($age.Minutes)m $($age.Seconds)s ago)" -ForegroundColor Green
        $lines = (Get-Content $rawReport | Measure-Object -Line).Lines
        Write-Host "      Lines: $lines"
    } else {
        Write-Host "   ⏳ Raw Report: Not yet generated" -ForegroundColor Yellow
    }
    
    if (Test-Path $finalReport) {
        Write-Host "   ✅ Final Report: EXISTS" -ForegroundColor Green
    } else {
        Write-Host "   ⏳ Final Report: Not yet generated" -ForegroundColor Yellow
    }
    
    Write-Host "`n📁 Recent Activity:" -ForegroundColor Cyan
    $recent = Get-ChildItem -Path "testsprite_tests\tmp" -Recurse -File -ErrorAction SilentlyContinue | 
        Where-Object { $_.LastWriteTime -gt (Get-Date).AddMinutes(-2) } | 
        Sort-Object LastWriteTime -Desc | 
        Select-Object -First 3
    
    if ($recent) {
        foreach ($f in $recent) {
            $age = (Get-Date) - $f.LastWriteTime
            Write-Host "   • $($f.Name) ($($age.Seconds)s ago)" -ForegroundColor Gray
        }
    } else {
        Write-Host "   (No recent activity)" -ForegroundColor Gray
    }
    
    Write-Host "`n" + ("=" * 60)
    Write-Host "`n⏱️  Next check in 30 seconds...`n"
    
    Start-Sleep -Seconds 30
}

Write-Host "`n✅ Monitoring complete. Checking final results...`n" -ForegroundColor Green
if (Test-Path $rawReport) {
    Write-Host "📄 Raw report location: $rawReport" -ForegroundColor Cyan
}
if (Test-Path $finalReport) {
    Write-Host "📄 Final report location: $finalReport" -ForegroundColor Cyan
}


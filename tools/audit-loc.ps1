$base = "c:\Users\Dhanush\OneDrive\Desktop\PROJECTS\EventDecor"
$results = @()

$files = Get-ChildItem -Recurse -File -Path "$base\backend\src","$base\backend\server.ts","$base\frontend\src","$base\backend\scripts","$base\backend\ops","$base\frontend\scripts","$base\frontend\vite.config.js" |
    Where-Object { $_.Extension -match '\.(ts|tsx|js|jsx|css|json|md|mjs|cjs|hbs)$' -and $_.FullName -notmatch 'node_modules|dist|coverage|\.git' }

foreach ($f in $files) {
    $lines = (Get-Content $f.FullName -ErrorAction SilentlyContinue | Measure-Object -Line).Lines
    $rel = $f.FullName.Replace("$base\", "")
    $results += [PSCustomObject]@{
        Path = $rel
        Ext = $f.Extension
        Lines = $lines
    }
}

Write-Host "=== TOTAL FILES: $($results.Count) ==="

# By extension
Write-Host "`n=== LOC BY EXTENSION ==="
$results | Group-Object Ext | ForEach-Object {
    [PSCustomObject]@{
        Extension = $_.Name
        FileCount = $_.Count
        TotalLines = ($_.Group | Measure-Object Lines -Sum).Sum
    }
} | Sort-Object TotalLines -Descending | Format-Table -AutoSize

Write-Host "`n=== TOP 120 LARGEST FILES ==="
$results | Sort-Object Lines -Descending | Select-Object -First 120 | Format-Table Path, Lines -AutoSize

# Backend vs Frontend
$backendLOC = ($results | Where-Object { $_.Path -like 'backend\*' } | Measure-Object Lines -Sum).Sum
$frontendLOC = ($results | Where-Object { $_.Path -like 'frontend\*' } | Measure-Object Lines -Sum).Sum
$totalLOC = ($results | Measure-Object Lines -Sum).Sum

Write-Host "`n=== SUMMARY ==="
Write-Host "Total LOC: $totalLOC"
Write-Host "Backend LOC: $backendLOC"
Write-Host "Frontend LOC: $frontendLOC"

# Category breakdowns
$controllers = $results | Where-Object { $_.Path -like '*controller*' -or $_.Path -like '*Controller*' } | Sort-Object Lines -Descending
$services = $results | Where-Object { ($_.Path -like '*service*' -or $_.Path -like '*Service*') -and $_.Path -notlike '*test*' } | Sort-Object Lines -Descending
$models = $results | Where-Object { $_.Path -like '*models\*' } | Sort-Object Lines -Descending
$hooks = $results | Where-Object { $_.Path -like '*hooks\*' -or $_.Path -like '*use*' } | Sort-Object Lines -Descending | Select-Object -First 30
$routes = $results | Where-Object { $_.Path -like '*routes\*' -or $_.Path -like '*Routes*' } | Sort-Object Lines -Descending
$utils = $results | Where-Object { $_.Path -like '*utils\*' -or $_.Path -like '*util*' } | Sort-Object Lines -Descending
$components = $results | Where-Object { $_.Path -like '*components\*' -and $_.Ext -match '\.(jsx|tsx)$' } | Sort-Object Lines -Descending | Select-Object -First 40
$tests = $results | Where-Object { $_.Path -like '*test*' -or $_.Path -like '*__tests__*' } | Sort-Object Lines -Descending
$middleware = $results | Where-Object { $_.Path -like '*middleware\*' } | Sort-Object Lines -Descending
$jobs = $results | Where-Object { $_.Path -like '*jobs\*' -or $_.Path -like '*Job*' } | Sort-Object Lines -Descending
$validators = $results | Where-Object { $_.Path -like '*validator*' -or $_.Path -like '*Validator*' -or $_.Path -like '*schema*' -or $_.Path -like '*Schema*' } | Sort-Object Lines -Descending
$css = $results | Where-Object { $_.Ext -eq '.css' } | Sort-Object Lines -Descending

Write-Host "`n=== CONTROLLERS ($($controllers.Count) files, $(($controllers | Measure-Object Lines -Sum).Sum) LOC) ==="
$controllers | Format-Table Path, Lines -AutoSize

Write-Host "`n=== SERVICES ($($services.Count) files, $(($services | Measure-Object Lines -Sum).Sum) LOC) ==="
$services | Format-Table Path, Lines -AutoSize

Write-Host "`n=== MODELS ($($models.Count) files, $(($models | Measure-Object Lines -Sum).Sum) LOC) ==="
$models | Format-Table Path, Lines -AutoSize

Write-Host "`n=== HOOKS (top 30) ==="
$hooks | Format-Table Path, Lines -AutoSize

Write-Host "`n=== ROUTES ($($routes.Count) files, $(($routes | Measure-Object Lines -Sum).Sum) LOC) ==="
$routes | Format-Table Path, Lines -AutoSize

Write-Host "`n=== UTILS ($($utils.Count) files, $(($utils | Measure-Object Lines -Sum).Sum) LOC) ==="
$utils | Format-Table Path, Lines -AutoSize

Write-Host "`n=== COMPONENTS (top 40 JSX/TSX) ==="
$components | Format-Table Path, Lines -AutoSize

Write-Host "`n=== TESTS ($($tests.Count) files, $(($tests | Measure-Object Lines -Sum).Sum) LOC) ==="
$tests | Format-Table Path, Lines -AutoSize

Write-Host "`n=== MIDDLEWARE ($($middleware.Count) files, $(($middleware | Measure-Object Lines -Sum).Sum) LOC) ==="
$middleware | Format-Table Path, Lines -AutoSize

Write-Host "`n=== JOBS ($($jobs.Count) files, $(($jobs | Measure-Object Lines -Sum).Sum) LOC) ==="
$jobs | Format-Table Path, Lines -AutoSize

Write-Host "`n=== VALIDATORS ($($validators.Count) files, $(($validators | Measure-Object Lines -Sum).Sum) LOC) ==="
$validators | Format-Table Path, Lines -AutoSize

Write-Host "`n=== CSS ($($css.Count) files, $(($css | Measure-Object Lines -Sum).Sum) LOC) ==="
$css | Format-Table Path, Lines -AutoSize

# Files over thresholds
foreach ($threshold in @(200, 400, 600, 800, 1000, 1500, 2000)) {
    $over = $results | Where-Object { $_.Lines -gt $threshold -and $_.Ext -match '\.(ts|tsx|js|jsx)$' }
    Write-Host "`n=== FILES OVER $threshold LOC: $($over.Count) ==="
}

# Count folders
$totalFolders = (Get-ChildItem -Recurse -Directory -Path "$base\backend\src","$base\frontend\src" | Where-Object { $_.FullName -notmatch 'node_modules|dist|coverage' }).Count
Write-Host "`nTotal source folders: $totalFolders"

Set-Location "c:\Users\kathe\OneDrive\Documentos\Hobbier\hobbier_app"
for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 120
    $b = eas build:list --platform android --limit 1 --json --non-interactive | ConvertFrom-Json
    $s = $b[0].status
    Write-Output "$(Get-Date -Format HH:mm:ss) -> $s"
    if ($s -eq 'FINISHED' -or $s -eq 'ERRORED' -or $s -eq 'CANCELED') {
        Write-Output "APK_URL: $($b[0].artifacts.buildUrl)"
        break
    }
}

$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
Write-Host "Cargo: $(cargo --version)"
Write-Host "Tauri dev baslatiliyor..."
npx tauri dev

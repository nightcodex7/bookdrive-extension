# PowerShell script to push changes to GitHub

Write-Host "Checking git status..." -ForegroundColor Green
git status

Write-Host "Adding all changes..." -ForegroundColor Green
git add .

Write-Host "Committing changes..." -ForegroundColor Green
git commit -m "Fix build error: Add featureManager export to lib/index.js and complete code cleanup"

Write-Host "Pushing to GitHub..." -ForegroundColor Green
git push origin main

Write-Host "Push completed successfully!" -ForegroundColor Green 
# PowerShell script to create ZIP files for Lambda deployment
# Run this script from the lambda-functions directory

Write-Host "Creating Lambda deployment ZIP files..." -ForegroundColor Green

# Create token-lambda.zip
Write-Host "`nCreating token-lambda.zip..." -ForegroundColor Cyan
Set-Location token-lambda
Compress-Archive -Path * -DestinationPath ..\token-lambda.zip -Force
Set-Location ..
Write-Host "✓ Created token-lambda.zip" -ForegroundColor Green

# Create user-lambda.zip
Write-Host "`nCreating user-lambda.zip..." -ForegroundColor Cyan
Set-Location user-lambda
Compress-Archive -Path * -DestinationPath ..\user-lambda.zip -Force
Set-Location ..
Write-Host "✓ Created user-lambda.zip" -ForegroundColor Green

Write-Host "`n✓ All ZIP files created successfully!" -ForegroundColor Green
Write-Host "`nYou can now upload these files to AWS Lambda:" -ForegroundColor Yellow
Write-Host "  - token-lambda.zip → token-exchange-function" -ForegroundColor White
Write-Host "  - user-lambda.zip → user-info-function" -ForegroundColor White
Write-Host "`nDon't forget to set environment variables in AWS Lambda console!" -ForegroundColor Yellow

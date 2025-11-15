# PowerShell script to build and deploy to S3
# Prerequisites: AWS CLI installed and configured with appropriate credentials

$BucketName = "english-exam-frontend"
$Region = "ap-southeast-1"
$DistributionId = "E140A23W6S04TI"

Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install

Write-Host "Building project..." -ForegroundColor Cyan
npm run build

if (-not (Test-Path ".\dist")) {
    Write-Host "Error: dist folder not found" -ForegroundColor Red
    exit 1
}

Write-Host "Uploading to S3 bucket: $BucketName" -ForegroundColor Cyan
aws s3 sync .\dist "s3://$BucketName/" --region $Region --delete

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ S3 upload completed!" -ForegroundColor Green
    
    Write-Host "Invalidating CloudFront distribution..." -ForegroundColor Cyan
    aws cloudfront create-invalidation --distribution-id $DistributionId --paths "/*"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ CloudFront invalidation failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ S3 upload failed" -ForegroundColor Red
    exit 1
}

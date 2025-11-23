#!/bin/bash
# Bash script to build and deploy to S3
# Prerequisites: AWS CLI installed and configured with appropriate credentials

BUCKET_NAME="english-exam-frontend"
REGION="ap-southeast-1"
DISTRIBUTION_ID="E140A23W6S04TI"

echo -e "\033[36mInstalling dependencies...\033[0m"
npm install

echo -e "\033[36mBuilding project...\033[0m"
npm run build

if [ ! -d "./dist" ]; then
    echo -e "\033[31mError: dist folder not found\033[0m"
    exit 1
fi

echo -e "\033[36mUploading to S3 bucket: $BUCKET_NAME\033[0m"
aws s3 sync ./dist "s3://$BUCKET_NAME/" --region "$REGION" --delete --profile hungtuong

if [ $? -eq 0 ]; then
    echo -e "\033[32m✅ S3 upload completed!\033[0m"
    
    echo -e "\033[36mInvalidating CloudFront distribution...\033[0m"
    aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/*" --profile hungtuong
    
    if [ $? -eq 0 ]; then
        echo -e "\033[32m✅ Deployment completed successfully!\033[0m"
    else
        echo -e "\033[31m❌ CloudFront invalidation failed\033[0m"
        exit 1
    fi
else
    echo -e "\033[31m❌ S3 upload failed\033[0m"
    exit 1
fi

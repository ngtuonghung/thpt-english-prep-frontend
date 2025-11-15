#!/bin/bash
# Bash script to create ZIP files for Lambda deployment
# Run this script from the lambda-functions directory

echo "Creating Lambda deployment ZIP files..."

# Create token-lambda.zip
echo ""
echo "Creating token-lambda.zip..."
cd token-lambda
zip -r ../token-lambda.zip .
cd ..
echo "✓ Created token-lambda.zip"

# Create user-lambda.zip
echo ""
echo "Creating user-lambda.zip..."
cd user-lambda
zip -r ../user-lambda.zip .
cd ..
echo "✓ Created user-lambda.zip"

echo ""
echo "✓ All ZIP files created successfully!"
echo ""
echo "You can now upload these files to AWS Lambda:"
echo "  - token-lambda.zip → token-exchange-function"
echo "  - user-lambda.zip → user-info-function"
echo ""
echo "Don't forget to set environment variables in AWS Lambda console!"

# Lambda Functions

This folder contains AWS Lambda functions for the authentication flow.

## Structure

```
lambda-functions/
├── token-lambda/          # Exchange authorization code for tokens
│   ├── index.js          # Lambda function code
│   ├── package.json      # No dependencies (Node.js 18+)
│   └── README.md         # Deployment instructions
│
└── user-lambda/          # Get user info from access token
    ├── index.js          # Lambda function code
    ├── package.json      # No dependencies (Node.js 18+)
    └── README.md         # Deployment instructions
```

## Quick Deployment

### Prerequisites
- AWS Account with Lambda and API Gateway access
- Node.js 18+ runtime selected in Lambda

### Steps

1. **Deploy token-lambda**:
   ```bash
   cd token-lambda
   # Option 1: Copy-paste index.js into AWS Lambda console (easiest)
   # Option 2: Create zip file
   zip -r ../token-lambda.zip .
   ```

2. **Deploy user-lambda**:
   ```bash
   cd user-lambda
   # Option 1: Copy-paste index.js into AWS Lambda console (easiest)
   # Option 2: Create zip file
   zip -r ../user-lambda.zip .
   ```

3. **Configure API Gateway**:
   - Add route: `GET /token` → `token-lambda`
   - Add route: `GET /user` → `user-lambda`
   - Enable CORS for both routes
   - Deploy to `prod` stage

4. **Set Environment Variables** (in AWS Lambda console):

   **token-lambda**:
   - `CLIENT_ID`: `4033t9pc3hhe7r84eq8mi2cnkj`
   - `CLIENT_SECRET`: (optional)
   - `COGNITO_DOMAIN`: `ap-southeast-1dmwikmffs.auth.ap-southeast-1.amazoncognito.com`

   **user-lambda**:
   - `COGNITO_DOMAIN`: `ap-southeast-1dmwikmffs.auth.ap-southeast-1.amazoncognito.com`

## No Dependencies Required!

Both Lambda functions use **Node.js 18+** which has built-in `fetch()` support.

**No npm install needed!** ✅

If you're using Node.js 16 or earlier, you'll need to add `node-fetch`:
```bash
npm install node-fetch@2
```

## Testing

Use the test script in the parent directory:
```bash
cd ..
node test-endpoints.js
```

## Architecture

```
User Login Flow:
1. User clicks login → Frontend calls /auth
2. /auth returns Cognito login URL
3. User logs in → Cognito redirects with code
4. Frontend calls /token with code → token-lambda
5. token-lambda exchanges code for tokens
6. Frontend calls /user with access_token → user-lambda
7. user-lambda returns user info (username, email, groups)
8. Frontend displays user info and shows/hides admin features
```

## Troubleshooting

- **"fetch is not defined"**: Use Node.js 18+ runtime
- **CORS errors**: Enable CORS in API Gateway and check headers
- **"Invalid token"**: Check token is being passed correctly in Authorization header
- **"No access token received"**: Check CloudWatch logs for detailed errors

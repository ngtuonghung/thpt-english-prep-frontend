# User Info Lambda Function

This Lambda function retrieves user information from Cognito using an access token.

## Environment Variables

Set these in AWS Lambda console:

- `COGNITO_DOMAIN`: `ap-southeast-1dmwikmffs.auth.ap-southeast-1.amazoncognito.com`

## Deployment

### Option 1: Direct Upload (Node.js 18+)

1. Create Lambda function in AWS Console
2. Runtime: **Node.js 18.x** or **Node.js 20.x**
3. Copy-paste the content of `index.js` directly into the Lambda editor
4. Set environment variables
5. Click Deploy

**No dependencies needed!** - `fetch()` is built-in in Node.js 18+

### Option 2: ZIP Upload (Any Node.js version)

```bash
# From this directory
zip -r user-lambda.zip .
```

Then upload `user-lambda.zip` to AWS Lambda.

## API Gateway Integration

- Method: `GET`
- Path: `/user`
- Headers: `Authorization: Bearer <access_token>` (required)
- Enable CORS

## Testing

```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  "https://your-api-gateway.amazonaws.com/prod/user"
```

Expected response:
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "email_verified": true,
  "phone_number": "+1234567890",
  "groups": ["admin"],
  "sub": "uuid-here"
}
```

## Admin Group Setup

To enable the "Upload PDF" button for specific users:

1. Go to AWS Cognito User Pool
2. Navigate to **Groups**
3. Create a group named `admin`
4. Add users to this group
5. Users in the `admin` group will see `"groups": ["admin"]` in the response

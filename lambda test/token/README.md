# Token Exchange Lambda Function

This Lambda function exchanges a Cognito authorization code for access tokens.

## Environment Variables

Set these in AWS Lambda console:

- `CLIENT_ID`: `4033t9pc3hhe7r84eq8mi2cnkj`
- `CLIENT_SECRET`: (optional, only if your Cognito app client has a secret)
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
zip -r token-lambda.zip .
```

Then upload `token-lambda.zip` to AWS Lambda.

## API Gateway Integration

- Method: `GET`
- Path: `/token`
- Query parameter: `code` (required)
- Enable CORS

## Testing

```bash
curl "https://your-api-gateway.amazonaws.com/prod/token?code=YOUR_AUTH_CODE"
```

Expected response:
```json
{
  "access_token": "...",
  "id_token": "...",
  "refresh_token": "...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

// Lambda function to exchange authorization code for tokens
// Runtime: Node.js 18.x or later (fetch is built-in)

exports.handler = async (event) => {
    try {
        const clientId = process.env.CLIENT_ID;
        const clientSecret = process.env.CLIENT_SECRET; // Optional
        const domain = process.env.COGNITO_DOMAIN;

        // Get code from query parameter
        const code = event.queryStringParameters?.code;

        if (!code) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Missing authorization code' })
            };
        }

        // Get origin to construct redirect_uri
        // Try multiple sources: headers, referer, or default
        let origin = event.headers?.origin || event.headers?.Origin;

        if (!origin && event.headers?.referer) {
            // Extract origin from referer URL
            try {
                const refererUrl = new URL(event.headers.referer);
                origin = refererUrl.origin;
            } catch (e) {
                console.error('Failed to parse referer:', e);
            }
        }

        if (!origin) {
            origin = 'http://localhost:5174';
        }

        const redirectUri = `${origin}/callback`;

        console.log('Exchanging code for tokens');
        console.log('Event headers:', JSON.stringify(event.headers));
        console.log('Origin:', origin);
        console.log('Redirect URI:', redirectUri);

        // Exchange code for tokens with Cognito
        const tokenEndpoint = `https://${domain}/oauth2/token`;

        // Prepare the request body
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('client_id', clientId);
        params.append('code', code);
        params.append('redirect_uri', redirectUri);

        // If you have a client secret, add it
        if (clientSecret) {
            params.append('client_secret', clientSecret);
        }

        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Token exchange failed:', errorText);
            throw new Error(`Token exchange failed: ${errorText}`);
        }

        const tokens = await response.json();

        console.log('Successfully exchanged code for tokens');

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': origin,
                'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
            },
            body: JSON.stringify({
                access_token: tokens.access_token,
                id_token: tokens.id_token,
                refresh_token: tokens.refresh_token,
                expires_in: tokens.expires_in,
                token_type: tokens.token_type
            })
        };
    } catch (err) {
        console.error('Token exchange error:', err);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Token exchange failed', details: err.message })
        };
    }
};

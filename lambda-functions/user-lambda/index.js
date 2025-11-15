// Lambda function to get user information using access token
// Runtime: Node.js 18.x or later (fetch is built-in)

// Helper function to decode JWT without verification (just to read claims)
function decodeJWT(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid JWT token');
        }
        // Decode the payload (middle part)
        const payload = Buffer.from(parts[1], 'base64').toString('utf8');
        return JSON.parse(payload);
    } catch (error) {
        console.error('Failed to decode JWT:', error);
        return null;
    }
}

exports.handler = async (event) => {
    try {
        const domain = process.env.COGNITO_DOMAIN;

        // Get access token from Authorization header
        const authHeader = event.headers?.Authorization || event.headers?.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                statusCode: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Missing or invalid authorization header' })
            };
        }

        const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix

        console.log('Fetching user info with access token');

        // Get user info from Cognito
        const userInfoEndpoint = `https://${domain}/oauth2/userInfo`;

        const response = await fetch(userInfoEndpoint, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('User info fetch failed:', errorText);
            throw new Error(`User info fetch failed: ${errorText}`);
        }

        const userInfo = await response.json();

        console.log('Successfully fetched user info');

        // Decode the access token to get groups (groups are in the token, not in /userInfo endpoint)
        const decodedToken = decodeJWT(accessToken);
        const groups = decodedToken?.['cognito:groups'] || [];

        console.log('Decoded token groups:', groups);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': event.headers?.origin || event.headers?.Origin || '*',
                'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
            },
            body: JSON.stringify({
                username: userInfo.username,
                email: userInfo.email,
                email_verified: userInfo.email_verified,
                phone_number: userInfo.phone_number,
                picture: userInfo.picture,
                groups: groups,
                sub: userInfo.sub
            })
        };
    } catch (err) {
        console.error('User info error:', err);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Failed to fetch user info', details: err.message })
        };
    }
};

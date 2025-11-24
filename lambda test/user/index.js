// Lambda function to get user information from ID token
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
        // Get ID token from Authorization header
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

        const idToken = authHeader.substring(7); // Remove 'Bearer ' prefix

        console.log('Decoding user info from ID token');

        // Decode the ID token to get all user information
        // ID token contains: sub, email, email_verified, phone_number, cognito:groups, cognito:username, etc.
        const decodedToken = decodeJWT(idToken);

        if (!decodedToken) {
            throw new Error('Failed to decode ID token');
        }

        console.log('Successfully decoded ID token');
        console.log('Token claims:', Object.keys(decodedToken));

        // Extract user information from ID token claims
        const groups = decodedToken['cognito:groups'] || [];
        const username = decodedToken['cognito:username'] || decodedToken.username || decodedToken.email?.split('@')[0];

        console.log('User groups:', groups);
        console.log('Username:', username);

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
                username: username,
                email: decodedToken.email,
                email_verified: decodedToken.email_verified,
                phone_number: decodedToken.phone_number,
                picture: decodedToken.picture,
                groups: groups,
                sub: decodedToken.sub,
                // Include any other custom claims
                name: decodedToken.name,
                given_name: decodedToken.given_name,
                family_name: decodedToken.family_name
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

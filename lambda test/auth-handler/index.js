exports.handler = async (event) => {
    try {
        const clientId = process.env.CLIENT_ID;
        const domain = process.env.COGNITO_DOMAIN;
        const frontendUrl = process.env.FRONTEND_URL;
        
        console.log('Using frontend URL:', frontendUrl);
        
        const callbackUrl = `${frontendUrl}/callback`;

        const loginUrl = `https://${domain}/login?client_id=${clientId}&response_type=code&scope=email+openid+phone+profile&redirect_uri=${encodeURIComponent(callbackUrl)}`;

        console.log('Callback URL:', callbackUrl);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': frontendUrl,
                'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
            },
            body: JSON.stringify({ loginUrl })
        };
    } catch (err) {
        console.error('Auth error:', err);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Authentication failed' })
        };
    }
};
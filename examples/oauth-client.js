/**
 * Example OAuth 2.0 Client for Bun Badges
 * 
 * This is a simple Node.js script that demonstrates how to:
 * 1. Register a new OAuth client
 * 2. Get an authorization URL
 * 3. Exchange an authorization code for tokens
 * 4. Use the access token to make API requests
 * 5. Refresh the access token
 * 6. Revoke tokens
 * 
 * Usage:
 * 1. Run the server: bun run src/index.ts
 * 2. Run this script: node examples/oauth-client.js
 */

const API_BASE_URL = 'http://localhost:3000';
const REDIRECT_URI = 'http://localhost:8000/callback';

// Utility function to make API requests
async function apiRequest(endpoint, method = 'GET', data = null, token = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const options = {
    method,
    headers,
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(url, options);
  return await response.json();
}

// Step 1: Register a new OAuth client
async function registerClient() {
  console.log('Step 1: Registering a new OAuth client...');
  
  const clientData = {
    client_name: 'Example Badge Client',
    redirect_uris: [REDIRECT_URI],
    client_uri: 'http://localhost:8000',
    logo_uri: 'http://localhost:8000/logo.png',
    scope: 'badge:read badge:create profile:read',
    grant_types: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_method: 'client_secret_basic'
  };
  
  try {
    const result = await apiRequest('/oauth/register', 'POST', clientData);
    console.log('Client registered successfully!');
    console.log('Client ID:', result.client_id);
    console.log('Client Secret:', result.client_secret);
    return result;
  } catch (error) {
    console.error('Error registering client:', error);
    throw error;
  }
}

// Step 2: Get authorization URL
function getAuthorizationUrl(clientId) {
  console.log('\nStep 2: Getting authorization URL...');
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    scope: 'badge:read badge:create profile:read',
    state: 'random-state-value'
  });
  
  const authUrl = `${API_BASE_URL}/oauth/authorize?${params.toString()}`;
  console.log('Authorization URL:', authUrl);
  console.log('Open this URL in your browser to authorize the client.');
  console.log('After authorization, you will be redirected to the callback URL with a code parameter.');
  
  return authUrl;
}

// Step 3: Exchange authorization code for tokens
async function exchangeCodeForTokens(clientId, clientSecret, code) {
  console.log('\nStep 3: Exchanging authorization code for tokens...');
  
  const tokenData = {
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: clientId,
    client_secret: clientSecret
  };
  
  try {
    const result = await apiRequest('/oauth/token', 'POST', tokenData);
    console.log('Tokens received successfully!');
    console.log('Access Token:', result.access_token);
    console.log('Refresh Token:', result.refresh_token);
    console.log('Token Type:', result.token_type);
    console.log('Expires In:', result.expires_in, 'seconds');
    console.log('Scope:', result.scope);
    return result;
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    throw error;
  }
}

// Step 4: Use the access token to make API requests
async function makeApiRequest(accessToken) {
  console.log('\nStep 4: Making API request with access token...');
  
  try {
    // Example API request to get user profile
    const result = await apiRequest('/api/profile', 'GET', null, accessToken);
    console.log('API request successful!');
    console.log('Response:', result);
    return result;
  } catch (error) {
    console.error('Error making API request:', error);
    throw error;
  }
}

// Step 5: Refresh the access token
async function refreshAccessToken(clientId, clientSecret, refreshToken) {
  console.log('\nStep 5: Refreshing access token...');
  
  const refreshData = {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret
  };
  
  try {
    const result = await apiRequest('/oauth/token', 'POST', refreshData);
    console.log('Access token refreshed successfully!');
    console.log('New Access Token:', result.access_token);
    console.log('Token Type:', result.token_type);
    console.log('Expires In:', result.expires_in, 'seconds');
    console.log('Scope:', result.scope);
    return result;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw error;
  }
}

// Step 6: Revoke a token
async function revokeToken(clientId, clientSecret, token) {
  console.log('\nStep 6: Revoking token...');
  
  const revokeData = {
    token,
    token_type_hint: 'access_token'
  };
  
  const headers = {
    'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
  };
  
  try {
    const result = await apiRequest('/oauth/revoke', 'POST', revokeData, headers);
    console.log('Token revoked successfully!');
    return result;
  } catch (error) {
    console.error('Error revoking token:', error);
    throw error;
  }
}

// Main function to run the example
async function main() {
  console.log('=== OAuth 2.0 Client Example ===\n');
  
  try {
    // Step 1: Register a new client
    const client = await registerClient();
    
    // Step 2: Get authorization URL
    const authUrl = getAuthorizationUrl(client.client_id);
    
    // In a real application, you would redirect the user to the authorization URL
    // and then handle the callback with the authorization code
    
    console.log('\n=== Manual Steps ===');
    console.log('1. Open the authorization URL in your browser');
    console.log('2. Approve the authorization request');
    console.log('3. Copy the code parameter from the redirect URL');
    console.log('4. Use the code to exchange for tokens');
    
    console.log('\n=== Example Code for Remaining Steps ===');
    console.log(`
// Step 3: Exchange authorization code for tokens
const code = 'AUTHORIZATION_CODE_FROM_REDIRECT';
const tokens = await exchangeCodeForTokens(client.client_id, client.client_secret, code);

// Step 4: Use the access token to make API requests
const apiResponse = await makeApiRequest(tokens.access_token);

// Step 5: Refresh the access token
const newTokens = await refreshAccessToken(client.client_id, client.client_secret, tokens.refresh_token);

// Step 6: Revoke a token
await revokeToken(client.client_id, client.client_secret, newTokens.access_token);
    `);
    
  } catch (error) {
    console.error('Error running OAuth client example:', error);
  }
}

// Run the example
main(); 
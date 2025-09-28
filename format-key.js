const fs = require('fs');

// Read the serviceAccountKey.json
const serviceAccount = JSON.parse(fs.readFileSync('serviceAccountKey.json', 'utf8'));

// Get the private key and replace newlines with \n
const formattedKey = serviceAccount.private_key.replace(/\n/g, '\\n');

// Output the formatted key
console.log('Formatted FIREBASE_PRIVATE_KEY:');
console.log(`"${formattedKey}"`);

// Also output other env vars for convenience
console.log('\nOther env vars:');
console.log(`FIREBASE_TYPE="${serviceAccount.type}"`);
console.log(`FIREBASE_PROJECT_ID="${serviceAccount.project_id}"`);
console.log(`FIREBASE_PRIVATE_KEY_ID="${serviceAccount.private_key_id}"`);
console.log(`FIREBASE_CLIENT_EMAIL="${serviceAccount.client_email}"`);
console.log(`FIREBASE_CLIENT_ID="${serviceAccount.client_id}"`);
console.log(`FIREBASE_AUTH_URI="${serviceAccount.auth_uri}"`);
console.log(`FIREBASE_TOKEN_URI="${serviceAccount.token_uri}"`);
console.log(`FIREBASE_AUTH_PROVIDER_X509_CERT_URL="${serviceAccount.auth_provider_x509_cert_url}"`);
console.log(`FIREBASE_CLIENT_X509_CERT_URL="${serviceAccount.client_x509_cert_url}"`);
console.log(`FIREBASE_DATABASE_URL="https://${serviceAccount.project_id}.firebaseio.com/"`);

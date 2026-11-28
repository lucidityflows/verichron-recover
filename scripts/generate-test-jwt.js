#!/usr/bin/env node
/**
 * Generate a test JWT token for API testing
 * Usage: node generate-test-jwt.js <USER_ID> <ORG_ID>
 */

const crypto = require('crypto');

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node generate-test-jwt.js <USER_ID> <ORG_ID>');
  console.error('Example: node generate-test-jwt.js 19107dc5-821e-4024-a92d-3e9a46d4d0fa 52b12b46-8f3f-4d8b-9213-ce6d1b1afb77');
  process.exit(1);
}

const userId = args[0];
const orgId = args[1];
const secret = 'supersecretjwtkeyfore2etesting'; // From .env.test

// JWT Header
const header = {
  alg: 'HS256',
  typ: 'JWT'
};

// JWT Payload
const now = Math.floor(Date.now() / 1000);
const payload = {
  sub: userId,
  iat: now,
  exp: now + 3600, // 1 hour expiration
  userType: 'ORGANIZATION_USER',
      'https://verichroninc.com/claims': {    organizationId: orgId,
    permissions: [
      'DEBTS_READ', 'DEBTS_WRITE', 'DEBTS_DELETE',
      'DEBTORS_READ', 'DEBTORS_WRITE',
      'WORKFLOWS_TEMPLATES_VIEW'
    ]
  }
};

// Base64URL encode
function base64url(input) {
  return Buffer.from(JSON.stringify(input))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Create signature
const headerEncoded = base64url(header);
const payloadEncoded = base64url(payload);
const message = `${headerEncoded}.${payloadEncoded}`;
const signature = crypto
  .createHmac('sha256', secret)
  .update(message)
  .digest('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=/g, '');

const jwt = `${message}.${signature}`;

console.log(jwt);

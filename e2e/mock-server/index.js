/**
 * Lightweight mock API server that mimics the Go police-cad-api backend.
 * Used in CI to allow Playwright tests to run without the real API.
 *
 * Start with: node e2e/mock-server/index.js
 * Expects MOCK_PORT env var (default: 9090)
 */

const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());

const PORT = process.env.MOCK_PORT || 9090;

// Load mock response data
const userResponse = require('./responses/user.json');
const communitiesResponse = require('./responses/communities.json');
const subscriptionTiers = require('./responses/subscription-tiers.json');
const communityTiers = require('./responses/community-tiers.json');
const contentCreators = require('./responses/content-creators.json');
const penalCodes = require('./responses/penal-codes.json');

// --- Auth endpoints ---

app.post('/api/v1/auth/token', (req, res) => {
  res.json({ token: 'mock-jwt-token-for-testing' });
});

app.delete('/api/v1/auth/logout', (req, res) => {
  res.json({ success: true });
});

// --- User endpoints ---

app.post('/api/v1/user/create-user', (req, res) => {
  res.status(201).json({
    _id: '507f1f77bcf86cd799439099',
    user: {
      email: req.body.email || 'new@test.com',
      username: req.body.username || 'newuser',
      callSign: req.body.callSign || '',
      createdAt: new Date().toISOString(),
    },
  });
});

app.post('/api/v1/user/check-user', (req, res) => {
  res.json({ exists: false });
});

app.get('/api/v1/user/:userId', (req, res) => {
  res.json(userResponse);
});

app.get('/api/v1/user/:userId/communities', (req, res) => {
  res.json(communitiesResponse);
});

app.post('/api/v1/user/reset-password', (req, res) => {
  res.json({ success: true, message: 'Password reset email sent.' });
});

// --- Community endpoints ---

app.get('/api/v1/community', (req, res) => {
  res.json(communitiesResponse);
});

app.get('/api/v1/community/:communityId', (req, res) => {
  res.json(communitiesResponse[0] || {});
});

app.post('/api/v1/community', (req, res) => {
  res.status(201).json({
    _id: '507f1f77bcf86cd799439050',
    community: {
      name: req.body.name || 'New Community',
      code: 'NEW123',
      ownerID: '507f1f77bcf86cd799439001',
    },
  });
});

app.post('/api/v1/community/join', (req, res) => {
  res.json({ success: true });
});

// --- Subscription endpoints ---

app.get('/api/v1/subscription/tiers', (req, res) => {
  res.json(subscriptionTiers);
});

app.get('/api/v1/subscription/community-tiers', (req, res) => {
  res.json(communityTiers);
});

// --- Content creators ---

app.get('/api/v1/content-creators', (req, res) => {
  res.json(contentCreators);
});

app.get('/api/v1/content-creators/:slug', (req, res) => {
  const creator = contentCreators.find((c) => c.slug === req.params.slug);
  res.json(creator || contentCreators[0]);
});

// --- Penal codes ---

app.get('/api/v1/penal-codes', (req, res) => {
  res.json(penalCodes);
});

// --- Announcements ---

app.get('/api/v1/community/:communityId/announcements', (req, res) => {
  res.json([]);
});

// --- Civilians / Vehicles / Firearms / Licenses ---

app.get('/api/v1/civilian', (req, res) => {
  res.json([]);
});

app.get('/api/v1/vehicle', (req, res) => {
  res.json([]);
});

app.get('/api/v1/firearm', (req, res) => {
  res.json([]);
});

app.get('/api/v1/license', (req, res) => {
  res.json([]);
});

// --- Warrants / Calls / BOLOs ---

app.get('/api/v1/warrant', (req, res) => {
  res.json([]);
});

app.get('/api/v1/call', (req, res) => {
  res.json([]);
});

app.get('/api/v1/bolo', (req, res) => {
  res.json([]);
});

// --- Medical ---

app.get('/api/v1/medical-report', (req, res) => {
  res.json([]);
});

app.get('/api/v1/medication', (req, res) => {
  res.json([]);
});

app.get('/api/v1/medical-condition', (req, res) => {
  res.json([]);
});

// --- Email check ---

app.post('/api/check-email', (req, res) => {
  res.json({ exists: false });
});

// --- Admin ---

app.post('/api/v1/admin/login', (req, res) => {
  res.json({ success: true, token: 'mock-admin-token' });
});

// --- Catch-all for unknown endpoints ---

app.all('*', (req, res) => {
  console.log(`[Mock API] Unhandled: ${req.method} ${req.path}`);
  res.status(200).json({});
});

// --- Start server ---

app.listen(PORT, () => {
  console.log(`Mock API server running on port ${PORT}`);
});

/** Shared test data constants used across all test files */

export const TEST_USER = {
  email: 'testuser@test.com',
  password: 'testpassword123',
  username: 'testuser',
  callSign: 'T-1',
};

export const TEST_ADMIN = {
  email: 'admin@test.com',
  password: 'adminpassword123',
  username: 'adminuser',
};

export const TEST_COMMUNITY = {
  id: '507f1f77bcf86cd799439011',
  name: 'Test Community',
  code: 'TEST123',
  ownerID: '507f1f77bcf86cd799439001',
};

export const MOCK_USER_RESPONSE = {
  user: {
    _id: '507f1f77bcf86cd799439001',
    user: {
      email: TEST_USER.email,
      username: TEST_USER.username,
      callSign: TEST_USER.callSign,
      createdAt: '2024-01-01T00:00:00.000Z',
      activeCommunity: TEST_COMMUNITY.id,
      lastAccessedCommunity: TEST_COMMUNITY.id,
      communities: [
        {
          uniqueId: TEST_COMMUNITY.id,
          communityName: TEST_COMMUNITY.name,
          communityCode: TEST_COMMUNITY.code,
        },
      ],
      subscription: {
        plan: 'free',
        active: false,
      },
      dispatchStatus: 'offline',
      isDeactivated: false,
    },
  },
};

export const MOCK_COMMUNITIES_RESPONSE = [
  {
    _id: TEST_COMMUNITY.id,
    community: {
      name: TEST_COMMUNITY.name,
      code: TEST_COMMUNITY.code,
      ownerID: TEST_COMMUNITY.ownerID,
      members: {},
      departments: [],
      description: 'A test community for E2E testing',
    },
  },
];

export const MOCK_SUBSCRIPTION_TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: ['Basic CAD access', 'Up to 5 civilians', 'Community access'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 4.99,
    features: ['Unlimited civilians', 'Priority support', 'Custom departments'],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 9.99,
    features: ['All Pro features', 'Custom branding', 'API access'],
  },
];

export const MOCK_COMMUNITY_TIERS = [
  {
    id: 'community-free',
    name: 'Free',
    price: 0,
    features: ['Up to 25 members', 'Basic features'],
  },
  {
    id: 'community-pro',
    name: 'Pro',
    price: 9.99,
    features: ['Up to 100 members', 'Custom roles'],
  },
];

export const MOCK_CONTENT_CREATORS = [
  {
    _id: '507f1f77bcf86cd799439021',
    slug: 'test-creator',
    displayName: 'Test Creator',
    bio: 'A test content creator',
    socialLinks: {
      youtube: 'https://youtube.com/test',
    },
    community: {
      name: 'Creator Community',
      code: 'CC123',
    },
  },
];

export const MOCK_PENAL_CODES = [
  {
    code: '10-1',
    description: 'Receiving Poorly',
    category: 'Radio Codes',
  },
  {
    code: '10-4',
    description: 'Acknowledgement',
    category: 'Radio Codes',
  },
  {
    code: '10-20',
    description: 'Location',
    category: 'Radio Codes',
  },
];

/** Public pages that should load without authentication */
export const PUBLIC_PAGES = [
  { path: '/', title: 'LPC' },
  { path: '/login', title: 'LPC' },
  { path: '/login-civ', title: 'LPC' },
  { path: '/signup', title: 'LPC' },
  { path: '/about-us', title: 'LPC' },
  { path: '/pricing', title: 'LPC' },
  { path: '/community-pricing', title: 'LPC' },
  { path: '/faq', title: 'LPC' },
  { path: '/contact-us', title: 'LPC' },
  { path: '/privacy-policy', title: 'LPC' },
  { path: '/terms-and-conditions', title: 'LPC' },
  { path: '/discord-bot', title: 'LPC' },
  { path: '/penal-code', title: 'LPC' },
  { path: '/content-creators', title: 'LPC' },
  { path: '/invite-code', title: 'LPC' },
  { path: '/forgot-password', title: 'LPC' },
];

/** Protected routes that should redirect unauthenticated users */
export const PROTECTED_ROUTES = [
  '/civ-dashboard',
  '/police-dashboard',
  '/dispatch-dashboard',
  '/ems-dashboard',
  '/community-dashboard',
];

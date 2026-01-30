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
    id: '507f1f77bcf86cd799439001',
    email: TEST_USER.email,
    username: TEST_USER.username,
    callSign: TEST_USER.callSign,
    createdAt: '2024-01-01T00:00:00.000Z',
    discordConnected: false,
    panicButtonSound: false,
    alertVolumeLevel: 10,
    profilePicture: '',
    subscription: {
      plan: 'free',
      active: false,
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

export const MOCK_SUBSCRIPTION_TIERS = {
  tiers: [
    {
      name: 'Base',
      key: 'base',
      monthlyPrice: 3,
      annualPrice: 32,
      features: ['5 communities', 'Default departments', 'Full ads'],
      color: '#3b82f6',
    },
    {
      name: 'Premium',
      key: 'premium',
      monthlyPrice: 8,
      annualPrice: 85,
      features: ['10 communities', 'Verified badge', '50% fewer ads'],
      color: '#667eea',
      popular: true,
    },
    {
      name: 'Premium +',
      key: 'premiumplus',
      monthlyPrice: 19.99,
      annualPrice: 210,
      features: ['Unlimited communities', 'Verified badge', 'Ad-free'],
      color: '#fbbf24',
    },
  ],
};

export const MOCK_COMMUNITY_TIERS = {
  tiers: [
    {
      name: 'Basic',
      key: 'basic',
      monthlyPrice: 3,
      features: ['Boosted in search results'],
      color: '#3b82f6',
    },
    {
      name: 'Standard',
      key: 'standard',
      monthlyPrice: 5,
      features: ['Boosted in search results', 'Promotional text in search', 'Verified community badge'],
      color: '#10b981',
    },
    {
      name: 'Premium',
      key: 'premium',
      monthlyPrice: 8,
      features: ['Boosted in search results', 'Promotional text in search', 'Verified community badge', 'Boost on Discover page'],
      color: '#667eea',
    },
    {
      name: 'Elite',
      key: 'elite',
      monthlyPrice: 15,
      features: ['Boosted in search results', 'Promotional text in search', 'Verified community badge', 'Boost on Discover page', 'Featured on Home Page', 'Promotional description (200 chars)'],
      color: '#fbbf24',
      popular: true,
    },
  ],
};

export const MOCK_CONTENT_CREATORS = {
  success: true,
  creators: [
    {
      _id: '507f1f77bcf86cd799439021',
      slug: 'test-creator',
      displayName: 'Test Creator',
      bio: 'A test content creator for Lines Police CAD',
      platforms: [
        {
          type: 'youtube',
          url: 'https://youtube.com/test',
          handle: '@testcreator',
          followerCount: 1500,
          verifiedByAdmin: true,
        },
      ],
      primaryPlatform: 'youtube',
      featured: true,
      joinedAt: '2024-06-15T00:00:00.000Z',
    },
  ],
};

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

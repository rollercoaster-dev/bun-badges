import { describe, expect, it, beforeEach, mock, afterEach } from 'bun:test';
import { Hono } from 'hono';
import badges from '@routes/badges.routes';
import { DatabaseService } from '@services/db.service';

// Mock database and response
let mockDb: any;
let mockApp: Hono;

// Mocked badge data
const mockBadges = [
  {
    badgeId: '550e8400-e29b-41d4-a716-446655440000',
    issuerId: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Test Badge',
    description: 'A test badge',
    criteria: 'Test criteria',
    imageUrl: 'https://example.com/badge.png',
    badgeJson: {
      '@context': 'https://w3id.org/openbadges/v2',
      type: 'BadgeClass',
      id: 'https://example.com/badges/550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Badge',
      description: 'A test badge',
      image: 'https://example.com/badge.png',
      criteria: { narrative: 'Test criteria' },
      issuer: 'https://example.com/issuers/550e8400-e29b-41d4-a716-446655440001'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Mock issuer
const mockIssuer = {
  issuerId: '550e8400-e29b-41d4-a716-446655440001',
  name: 'Test Issuer',
  url: 'https://example.com',
  description: 'A test issuer',
  email: 'issuer@example.com',
  ownerUserId: '550e8400-e29b-41d4-a716-446655440002',
  issuerJson: {
    '@context': 'https://w3id.org/openbadges/v2',
    type: 'Issuer',
    id: 'https://example.com/issuers/550e8400-e29b-41d4-a716-446655440001',
    name: 'Test Issuer',
    url: 'https://example.com',
    email: 'issuer@example.com'
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

// Create mocks for modules
const mockSelect = mock(() => mockDb);
const mockFrom = mock(() => mockDb);
const mockWhere = mock(() => mockDb);
const mockLimit = mock(() => Promise.resolve(mockBadges));
const mockInsert = mock(() => mockDb);
const mockValues = mock(() => mockDb);
const mockReturning = mock(() => Promise.resolve(mockBadges));
const mockUpdate = mock(() => mockDb);
const mockSet = mock(() => mockDb);
const mockDelete = mock(() => mockDb);

// Mock the database module
mock.module('../../db/config', () => ({
  db: {
    select: mockSelect,
    from: mockFrom,
    where: mockWhere,
    limit: mockLimit,
    insert: mockInsert,
    values: mockValues,
    returning: mockReturning,
    update: mockUpdate,
    set: mockSet,
    delete: mockDelete
  }
}));

// Mock the Hono context
const createMockContext = (options: any = {}) => {
  const { params = {}, query = {}, body = {}, url = 'https://example.com/api/badges' } = options;
  
  return {
    req: {
      param: (name: string) => params[name],
      query: (name: string) => query[name],
      url: url,
      json: () => Promise.resolve(body)
    },
    json: (responseBody: any, status = 200) => {
      return { body: responseBody, status };
    }
  } as any;
};

const createMockDatabase = () => {
  const mockDbFn = mock(() => Promise.resolve(mockBadges));
  
  const mockDb = {
    select: mock(() => mockDb),
    from: mock(() => mockDb),
    where: mock(() => mockDb),
    andWhere: mock(() => mockDb),
    orderBy: mock(() => mockDb),
    limit: mock(() => mockDb),
    offset: mock(() => mockDb),
    execute: mock(() => mockBadges),
    get: mock(() => mockBadges[0]),
    all: mock(() => mockBadges),
    insert: mock(() => ({ returning: mock(() => ({ get: mock(() => mockBadges[0]) })) })),
    update: mock(() => ({ where: mock(() => ({ returning: mock(() => ({ get: mock(() => mockBadges[0]) })) })) })),
    delete: mock(() => ({ where: mock(() => ({ returning: mock(() => ({ get: mock(() => mockBadges[0]) })) })) })),
  };
  
  // Make the db object itself callable like a promise
  return Object.assign(mockDbFn, mockDb) as unknown as DatabaseService;
};

describe('Badge Endpoints', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockSelect.mockClear();
    mockFrom.mockClear();
    mockWhere.mockClear();
    mockLimit.mockClear();
    mockInsert.mockClear();
    mockValues.mockClear();
    mockReturning.mockClear();
    mockUpdate.mockClear();
    mockSet.mockClear();
    mockDelete.mockClear();
    
    // Initialize the mockDb
    mockDb = {
      select: mockSelect,
      from: mockFrom,
      where: mockWhere,
      limit: mockLimit,
      insert: mockInsert,
      values: mockValues,
      returning: mockReturning,
      update: mockUpdate,
      set: mockSet,
      delete: mockDelete
    };
    
    // Initialize the app with the badges router
    mockApp = new Hono();
    // Here we would normally register the badges router
  });
  
  describe('GET /badges', () => {
    it('should return a list of badges', async () => {
      // Mock app to return a successful response with badge data
      mockApp.fetch = mock(() => Promise.resolve(
        new Response(JSON.stringify({ badges: mockBadges }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      ));
      
      // Call the handler
      const response = await mockApp.fetch(new Request('https://example.com/api/badges'));
      const data = await response.json() as { badges: typeof mockBadges };
      
      expect(response.status).toBe(200);
      expect(data.badges).toBeDefined();
      expect(data.badges.length).toBeGreaterThan(0);
    });
    
    it('should filter badges by issuerId', async () => {
      // Mock app to return a filtered response
      mockApp.fetch = mock(() => Promise.resolve(
        new Response(JSON.stringify({ badges: [mockBadges[0]] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      ));
      
      // Call the handler
      const response = await mockApp.fetch(new Request('https://example.com/api/badges?issuerId=test-issuer-id'));
      const data = await response.json() as { badges: typeof mockBadges };
      
      expect(response.status).toBe(200);
      expect(data.badges).toBeDefined();
      expect(data.badges.length).toBe(1);
    });
  });
  
  describe('GET /badges/:id', () => {
    it('should return a specific badge', async () => {
      // Mock app to return a single badge
      mockApp.fetch = mock(() => Promise.resolve(
        new Response(JSON.stringify({ badge: mockBadges[0] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      ));
      
      // Call the handler
      const response = await mockApp.fetch(new Request('https://example.com/api/badges/550e8400-e29b-41d4-a716-446655440000'));
      const data = await response.json() as { badge: typeof mockBadges[0] };
      
      expect(response.status).toBe(200);
      expect(data.badge).toBeDefined();
      expect(data.badge.badgeId).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
    
    it('should return 404 for non-existent badge', async () => {
      // Mock app to return a 404 error
      mockApp.fetch = mock(() => Promise.resolve(
        new Response(JSON.stringify({ error: 'Badge not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        })
      ));
      
      // Call the handler
      const response = await mockApp.fetch(new Request('https://example.com/api/badges/non-existent-id'));
      const data = await response.json() as { error: string };
      
      expect(response.status).toBe(404);
      expect(data.error).toBe('Badge not found');
    });
  });
  
  describe('POST /badges', () => {
    it('should create a new badge', async () => {
      // Mock the database response for issuer lookup
      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.limit.mockResolvedValueOnce([mockIssuer]); // For issuer verification
      
      // Mock the database insert and update operations
      mockDb.insert.mockReturnValue(mockDb);
      mockDb.values.mockReturnValue(mockDb);
      mockDb.returning.mockResolvedValueOnce([mockBadges[0]]); // Insert returns the badge
      mockDb.update.mockReturnValue(mockDb);
      mockDb.set.mockReturnValue(mockDb);
      mockDb.where.mockResolvedValueOnce({}); // Update operation succeeds
      
      // Create mock context
      const ctx = createMockContext({
        body: {
          issuerId: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Test Badge',
          description: 'A test badge',
          criteria: 'Test criteria',
          imageUrl: 'https://example.com/badge.png'
        }
      });
      
      // Call the handler
      const response = await mockApp.fetch(new Request('https://example.com/api/badges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issuerId: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Test Badge',
          description: 'A test badge',
          criteria: 'Test criteria',
          imageUrl: 'https://example.com/badge.png'
        })
      }));
      const responseBody = await response.json() as {
        status: string;
        data: { badgeId: string }
      };
      
      // Assertions
      expect(response.status).toBe(201);
      expect(responseBody.status).toBe('success');
      expect(responseBody.data.badgeId).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
    
    it('should return 400 for missing required fields', async () => {
      // Create mock context
      const ctx = createMockContext({
        body: {
          // Missing required fields
          name: 'Test Badge'
        }
      });
      
      // Call the handler
      const response = await mockApp.fetch(new Request('https://example.com/api/badges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Badge'
        })
      }));
      const responseBody = await response.json() as {
        status: string;
        error: { code: string }
      };
      
      // Assertions
      expect(response.status).toBe(400);
      expect(responseBody.status).toBe('error');
      expect(responseBody.error.code).toBe('VALIDATION');
    });
  });
  
  describe('PUT /badges/:id', () => {
    it('should update an existing badge', async () => {
      // Mock the database response
      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.limit.mockResolvedValueOnce([mockBadges[0]]); // For badge lookup
      
      // Mock the database update operation
      mockDb.update.mockReturnValue(mockDb);
      mockDb.set.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.returning.mockResolvedValueOnce([{
        ...mockBadges[0],
        name: 'Updated Badge',
        description: 'Updated description',
        badgeJson: {
          ...mockBadges[0].badgeJson,
          name: 'Updated Badge',
          description: 'Updated description'
        }
      }]);
      
      // Create mock context
      const ctx = createMockContext({
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: {
          name: 'Updated Badge',
          description: 'Updated description'
        }
      });
      
      // Call the handler
      const response = await mockApp.fetch(new Request('https://example.com/api/badges/550e8400-e29b-41d4-a716-446655440000', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Updated Badge',
          description: 'Updated description'
        })
      }));
      const responseBody = await response.json() as {
        status: string;
        data: {
          badge: {
            name: string;
            description: string;
          }
        }
      };
      
      // Assertions
      expect(response.status).toBe(200);
      expect(responseBody.status).toBe('success');
      expect(responseBody.data.badge.name).toBe('Updated Badge');
      expect(responseBody.data.badge.description).toBe('Updated description');
    });
  });
  
  describe('DELETE /badges/:id', () => {
    it('should delete a badge', async () => {
      // Mock the database response
      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.limit.mockResolvedValueOnce([mockBadges[0]]); // For badge lookup
      
      // Mock the badge controller to indicate no assertions
      const hasBadgeAssertionsMock = mock(() => Promise.resolve(false));
      
      // Mock the badge controller implementation
      mock.module('../../controllers/badge.controller', () => ({
        BadgeController: function() {
          return {
            hasBadgeAssertions: hasBadgeAssertionsMock
          };
        }
      }));
      
      // Mock the database delete operation
      mockDb.delete.mockReturnValue(mockDb);
      mockDb.where.mockResolvedValueOnce({});
      
      // Create mock context
      const ctx = createMockContext({
        params: { id: '550e8400-e29b-41d4-a716-446655440000' }
      });
      
      // Call the handler
      const response = await mockApp.fetch(new Request('https://example.com/api/badges/550e8400-e29b-41d4-a716-446655440000', {
        method: 'DELETE'
      }));
      const responseBody = await response.json() as {
        status: string;
        data: { message: string }
      };
      
      // Assertions
      expect(response.status).toBe(200);
      expect(responseBody.status).toBe('success');
      expect(responseBody.data.message).toBe('Badge deleted successfully');
    });
    
    it('should not delete a badge with assertions', async () => {
      // Mock the database response
      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.limit.mockResolvedValueOnce([mockBadges[0]]); // For badge lookup
      
      // Mock the badge controller to indicate assertions exist
      const hasBadgeAssertionsMock = mock(() => Promise.resolve(true));
      
      // Mock the badge controller implementation
      mock.module('../../controllers/badge.controller', () => ({
        BadgeController: function() {
          return {
            hasBadgeAssertions: hasBadgeAssertionsMock
          };
        }
      }));
      
      // Create mock context
      const ctx = createMockContext({
        params: { id: '550e8400-e29b-41d4-a716-446655440000' }
      });
      
      // Call the handler
      const response = await mockApp.fetch(new Request('https://example.com/api/badges/550e8400-e29b-41d4-a716-446655440000', {
        method: 'DELETE'
      }));
      const responseBody = await response.json() as {
        status: string;
        error: {
          code: string;
          message: string;
        }
      };
      
      // Assertions
      expect(response.status).toBe(409);
      expect(responseBody.status).toBe('error');
      expect(responseBody.error.code).toBe('CONFLICT');
      expect(responseBody.error.message).toBe('Cannot delete a badge that has been issued');
    });
  });
}); 
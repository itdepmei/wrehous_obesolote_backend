const request = require('supertest');
const app = require('../server'); // Adjust this path to your main server file
const { connect } = require('../src/config/db');

// Connect to the database before running tests
beforeAll(async () => {
  await connect();
});

// Test suite for API endpoints
describe('API Routes', () => {
  
  // Test the health check endpoint
  describe('GET /', () => {
    it('should return 200 OK with a welcome message', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });
  });

  // Test the large data endpoint (mentioned in your load test file)
  describe('GET /large-data-endpoint', () => {
    it('should return data successfully', async () => {
      const response = await request(app).get('/large-data-endpoint');
      expect(response.status).toBe(200);
    });
  });

  // Add more test cases for your other routes
  // For example, if you have user routes:
  describe('User Routes', () => {
    // Test user creation
    it('should create a new user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };
      
      const response = await request(app)
        .post('/api/users')
        .send(userData);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
    });

    // Test user retrieval
    it('should get user by ID', async () => {
      // First create a user to get an ID
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          username: 'getuser',
          email: 'get@example.com',
          password: 'password123'
        });
      
      const userId = createResponse.body.id;
      
      // Now test getting the user
      const response = await request(app).get(`/api/users/${userId}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('username', 'getuser');
    });
  });

  // Add tests for authentication if applicable
  describe('Authentication', () => {
    it('should login with valid credentials', async () => {
      // First create a user
      await request(app)
        .post('/api/users')
        .send({
          username: 'loginuser',
          email: 'login@example.com',
          password: 'password123'
        });
      
      // Test login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'wrongpassword'
        });
      
      expect(response.status).toBe(401);
    });
  });
});
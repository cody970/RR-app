import { test, expect } from '@playwright/test';

const API_BASE_URL = 'http://localhost:3000/api';

test.describe('API Endpoints', () => {
  test('should return health status', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/health`);
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('status');
  });

  test('should reject unauthenticated API requests', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/statements`);
    
    // Should return 401 or 403 for unauthenticated requests
    expect([401, 403]).toContain(response.status());
  });

  test('should have proper CORS headers', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/health`);
    
    const headers = response.headers();
    expect(headers).toHaveProperty('access-control-allow-origin');
  });

  test('should validate request data', async ({ request }) => {
    // Test with invalid data
    const response = await request.post(`${API_BASE_URL}/writers`, {
      data: {
        // Missing required fields
        name: 'Test Writer'
      }
    });
    
    // Should return validation error
    expect([400, 422]).toContain(response.status());
    
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });
});
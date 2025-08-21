const request = require('supertest');
const app = require('../src/index');
const { supabase } = require('../src/config/database');

// Mock the database and services for testing
jest.mock('../src/config/database');
jest.mock('../src/services/notificationService');

describe('Webhook Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /webhook/retell', () => {
    const validWebhookData = {
      call_id: 'test-call-123',
      call_status: 'completed',
      agent_id: 'test-agent-456',
      transcript: 'Hello, my name is John Doe. My phone number is 555-123-4567. I need help with a plumbing issue.',
      recording_url: 'https://recordings.retellai.com/test-recording.mp3',
      from_number: '+15551234567',
      to_number: '+15559876543',
      call_duration: 120
    };

    it('should process valid webhook data successfully', async () => {
      // Mock database responses
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'business-123',
                business_name: 'Test Plumbing',
                owner_phone: '+15559876543',
                slack_webhook_url: 'https://hooks.slack.com/test'
              },
              error: null
            })
          })
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'test-call-123' },
              error: null
            })
          })
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'test-call-123' },
                error: null
              })
            })
          })
        })
      });

      const response = await request(app)
        .post('/webhook/retell')
        .send(validWebhookData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.call_id).toBe('test-call-123');
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        call_id: 'test-call-123'
        // Missing required fields
      };

      const response = await request(app)
        .post('/webhook/retell')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return 400 for invalid call status', async () => {
      const invalidData = {
        ...validWebhookData,
        call_status: 'invalid-status'
      };

      const response = await request(app)
        .post('/webhook/retell')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /webhook/health', () => {
    it('should return webhook health status', async () => {
      const response = await request(app)
        .get('/webhook/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Webhook endpoints are healthy');
    });
  });
});

const express = require('express');
const { body, validationResult } = require('express-validator');
const { asyncHandler } = require('../middleware/errorHandler');
const webhookController = require('../controllers/webhookController');

const router = express.Router();

/**
 * POST /webhook/retell
 * Handle call events from Retell AI (call_started, call_ended, call_analyzed)
 */
router.post('/retell', [
  body('call_id').notEmpty().withMessage('Call ID is required'),
  body('to_number').notEmpty().withMessage('To number (business phone) is required'),
  body('event_type').optional().isIn(['call_started', 'call_ended', 'call_analyzed']).withMessage('Invalid event type'),
  body('call_status').optional().isIn(['completed', 'failed', 'in-progress']).withMessage('Invalid call status'),
  body('transcript').optional().isString().withMessage('Transcript must be a string'),
  body('recording_url').optional().isURL().withMessage('Recording URL must be a valid URL'),
  body('from_number').optional().isString().withMessage('From number must be a string'),
  body('agent_id').optional().isString().withMessage('Agent ID is optional')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const result = await webhookController.handleRetellWebhook(req.body);
  res.json(result);
}));

/**
 * GET /webhook/health
 * Webhook endpoint health check
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Webhook endpoints are healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

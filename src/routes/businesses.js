const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { asyncHandler } = require('../middleware/errorHandler');
const businessController = require('../controllers/businessController');

const router = express.Router();

/**
 * POST /api/businesses
 * Create a new business (manual onboarding)
 */
router.post('/', [
  body('business_name').notEmpty().trim().withMessage('Business name is required'),
  body('owner_name').notEmpty().trim().withMessage('Owner name is required'),
  body('owner_phone').notEmpty().trim().withMessage('Owner phone is required'),
  body('slack_webhook_url').optional().isURL().withMessage('Slack webhook must be a valid URL'),
  body('retell_agent_id').notEmpty().trim().withMessage('Retell agent ID is required'),
  body('phone_number').notEmpty().trim().withMessage('Phone number is required'),
  body('area_code').notEmpty().trim().isLength({ min: 3, max: 3 }).withMessage('Area code must be 3 digits'),
  body('custom_instructions').optional().isString().withMessage('Custom instructions must be a string')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const result = await businessController.createBusiness(req.body);
  res.status(201).json(result);
}));

/**
 * GET /api/businesses/:id
 * Get business details by ID
 */
router.get('/:id', [
  param('id').isUUID().withMessage('Invalid business ID format')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const result = await businessController.getBusinessById(req.params.id);
  res.json(result);
}));

/**
 * GET /api/businesses/:id/calls
 * Get call history for a business
 */
router.get('/:id/calls', [
  param('id').isUUID().withMessage('Invalid business ID format'),
  body('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  body('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
  body('start_date').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
  body('end_date').optional().isISO8601().withMessage('End date must be a valid ISO date')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const result = await businessController.getBusinessCalls(req.params.id, req.query);
  res.json(result);
}));

/**
 * PUT /api/businesses/:id
 * Update business information
 */
router.put('/:id', [
  param('id').isUUID().withMessage('Invalid business ID format'),
  body('business_name').optional().trim().notEmpty().withMessage('Business name cannot be empty'),
  body('owner_name').optional().trim().notEmpty().withMessage('Owner name cannot be empty'),
  body('owner_phone').optional().trim().notEmpty().withMessage('Owner phone cannot be empty'),
  body('slack_webhook_url').optional().isURL().withMessage('Slack webhook must be a valid URL'),
  body('custom_instructions').optional().isString().withMessage('Custom instructions must be a string'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const result = await businessController.updateBusiness(req.params.id, req.body);
  res.json(result);
}));

/**
 * PUT /api/businesses/:id/prompt
 * Update AI prompt/instructions for a business
 */
router.put('/:id/prompt', [
  param('id').isUUID().withMessage('Invalid business ID format'),
  body('custom_instructions').notEmpty().trim().withMessage('Custom instructions are required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const result = await businessController.updateBusinessPrompt(req.params.id, req.body.custom_instructions);
  res.json(result);
}));

/**
 * DELETE /api/businesses/:id
 * Deactivate a business (soft delete)
 */
router.delete('/:id', [
  param('id').isUUID().withMessage('Invalid business ID format')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const result = await businessController.deactivateBusiness(req.params.id);
  res.json(result);
}));

/**
 * GET /api/businesses
 * List all businesses (with pagination)
 */
router.get('/', [
  body('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  body('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const result = await businessController.listBusinesses(req.query);
  res.json(result);
}));

module.exports = router;

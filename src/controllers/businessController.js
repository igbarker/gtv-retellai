const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { supabase } = require('../config/database');
const { NotFoundError, ValidationError, ConflictError } = require('../middleware/errorHandler');

/**
 * Business Controller for managing business operations
 */
class BusinessController {
  /**
   * Create a new business
   * @param {Object} businessData - Business information
   * @returns {Promise<Object>} Created business
   */
  async createBusiness(businessData) {
    try {
      logger.info('Creating new business', {
        businessName: businessData.business_name,
        ownerName: businessData.owner_name
      });

      // Check if phone number already exists
      const { data: existingPhone, error: phoneCheckError } = await supabase
        .from('businesses')
        .select('id')
        .eq('phone_number', businessData.phone_number)
        .single();

      if (existingPhone && !phoneCheckError) {
        throw new ConflictError('Phone number already registered');
      }

      // Check if agent ID already exists
      const { data: existingAgent, error: agentCheckError } = await supabase
        .from('businesses')
        .select('id')
        .eq('retell_agent_id', businessData.retell_agent_id)
        .single();

      if (existingAgent && !agentCheckError) {
        throw new ConflictError('Retell agent ID already registered');
      }

      // Create business record
      const { data: business, error } = await supabase
        .from('businesses')
        .insert({
          id: uuidv4(),
          business_name: businessData.business_name,
          owner_name: businessData.owner_name,
          owner_phone: businessData.owner_phone,
          slack_webhook_url: businessData.slack_webhook_url,
          retell_agent_id: businessData.retell_agent_id,
          phone_number: businessData.phone_number,
          area_code: businessData.area_code,
          custom_prompt: businessData.custom_instructions,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create business: ${error.message}`);
      }

      logger.info('Business created successfully', {
        businessId: business.id,
        businessName: business.business_name
      });

      return {
        success: true,
        business: {
          id: business.id,
          business_name: business.business_name,
          owner_name: business.owner_name,
          owner_phone: business.owner_phone,
          phone_number: business.phone_number,
          area_code: business.area_code,
          is_active: business.is_active,
          created_at: business.created_at
        }
      };

    } catch (error) {
      logger.error('Failed to create business', {
        error: error.message,
        businessData
      });
      throw error;
    }
  }

  /**
   * Get business by ID
   * @param {string} businessId - Business ID
   * @returns {Promise<Object>} Business data
   */
  async getBusinessById(businessId) {
    try {
      const { data: business, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      if (error || !business) {
        throw new NotFoundError('Business not found');
      }

      return {
        success: true,
        business: {
          id: business.id,
          business_name: business.business_name,
          owner_name: business.owner_name,
          owner_phone: business.owner_phone,
          slack_webhook_url: business.slack_webhook_url,
          phone_number: business.phone_number,
          area_code: business.area_code,
          custom_prompt: business.custom_prompt,
          is_active: business.is_active,
          created_at: business.created_at,
          updated_at: business.updated_at
        }
      };

    } catch (error) {
      logger.error('Failed to get business by ID', {
        error: error.message,
        businessId
      });
      throw error;
    }
  }

  /**
   * Get call history for a business
   * @param {string} businessId - Business ID
   * @param {Object} queryParams - Query parameters for filtering and pagination
   * @returns {Promise<Object>} Call history
   */
  async getBusinessCalls(businessId, queryParams) {
    try {
      // Verify business exists
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('id', businessId)
        .single();

      if (businessError || !business) {
        throw new NotFoundError('Business not found');
      }

      // Build query
      let query = supabase
        .from('calls')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (queryParams.start_date) {
        query = query.gte('created_at', queryParams.start_date);
      }
      if (queryParams.end_date) {
        query = query.lte('created_at', queryParams.end_date);
      }

      // Apply pagination
      const limit = parseInt(queryParams.limit) || 50;
      const offset = parseInt(queryParams.offset) || 0;
      
      query = query.range(offset, offset + limit - 1);

      const { data: calls, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch calls: ${error.message}`);
      }

      // Get total count for pagination
      const { count: totalCount, error: countError } = await supabase
        .from('calls')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId);

      if (countError) {
        logger.warn('Failed to get total call count', { error: countError.message });
      }

      return {
        success: true,
        calls: calls || [],
        pagination: {
          limit,
          offset,
          total: totalCount || 0,
          has_more: (offset + limit) < (totalCount || 0)
        }
      };

    } catch (error) {
      logger.error('Failed to get business calls', {
        error: error.message,
        businessId,
        queryParams
      });
      throw error;
    }
  }

  /**
   * Update business information
   * @param {string} businessId - Business ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated business
   */
  async updateBusiness(businessId, updateData) {
    try {
      // Verify business exists
      const { data: existingBusiness, error: fetchError } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      if (fetchError || !existingBusiness) {
        throw new NotFoundError('Business not found');
      }

      // Check for conflicts if updating phone number
      if (updateData.phone_number && updateData.phone_number !== existingBusiness.phone_number) {
        const { data: conflictingPhone, error: phoneCheckError } = await supabase
          .from('businesses')
          .select('id')
          .eq('phone_number', updateData.phone_number)
          .neq('id', businessId)
          .single();

        if (conflictingPhone && !phoneCheckError) {
          throw new ConflictError('Phone number already registered to another business');
        }
      }

      // Update business
      const { data: updatedBusiness, error } = await supabase
        .from('businesses')
        .update(updateData)
        .eq('id', businessId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update business: ${error.message}`);
      }

      logger.info('Business updated successfully', {
        businessId,
        updatedFields: Object.keys(updateData)
      });

      return {
        success: true,
        business: {
          id: updatedBusiness.id,
          business_name: updatedBusiness.business_name,
          owner_name: updatedBusiness.owner_name,
          owner_phone: updatedBusiness.owner_phone,
          slack_webhook_url: updatedBusiness.slack_webhook_url,
          phone_number: updatedBusiness.phone_number,
          area_code: updatedBusiness.area_code,
          custom_prompt: updatedBusiness.custom_prompt,
          is_active: updatedBusiness.is_active,
          updated_at: updatedBusiness.updated_at
        }
      };

    } catch (error) {
      logger.error('Failed to update business', {
        error: error.message,
        businessId,
        updateData
      });
      throw error;
    }
  }

  /**
   * Update business AI prompt/instructions
   * @param {string} businessId - Business ID
   * @param {string} customInstructions - Custom AI instructions
   * @returns {Promise<Object>} Updated business
   */
  async updateBusinessPrompt(businessId, customInstructions) {
    try {
      // Verify business exists
      const { data: existingBusiness, error: fetchError } = await supabase
        .from('businesses')
        .select('id')
        .eq('id', businessId)
        .single();

      if (fetchError || !existingBusiness) {
        throw new NotFoundError('Business not found');
      }

      // Update custom prompt
      const { data: updatedBusiness, error } = await supabase
        .from('businesses')
        .update({ custom_prompt: customInstructions })
        .eq('id', businessId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update business prompt: ${error.message}`);
      }

      logger.info('Business prompt updated successfully', { businessId });

      return {
        success: true,
        message: 'Business prompt updated successfully',
        business: {
          id: updatedBusiness.id,
          custom_prompt: updatedBusiness.custom_prompt,
          updated_at: updatedBusiness.updated_at
        }
      };

    } catch (error) {
      logger.error('Failed to update business prompt', {
        error: error.message,
        businessId
      });
      throw error;
    }
  }

  /**
   * Deactivate a business (soft delete)
   * @param {string} businessId - Business ID
   * @returns {Promise<Object>} Deactivation result
   */
  async deactivateBusiness(businessId) {
    try {
      // Verify business exists
      const { data: existingBusiness, error: fetchError } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      if (fetchError || !existingBusiness) {
        throw new NotFoundError('Business not found');
      }

      if (!existingBusiness.is_active) {
        throw new ValidationError('Business is already deactivated');
      }

      // Deactivate business
      const { data: deactivatedBusiness, error } = await supabase
        .from('businesses')
        .update({ is_active: false })
        .eq('id', businessId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to deactivate business: ${error.message}`);
      }

      logger.info('Business deactivated successfully', { businessId });

      return {
        success: true,
        message: 'Business deactivated successfully',
        business: {
          id: deactivatedBusiness.id,
          business_name: deactivatedBusiness.business_name,
          is_active: deactivatedBusiness.is_active,
          updated_at: deactivatedBusiness.updated_at
        }
      };

    } catch (error) {
      logger.error('Failed to deactivate business', {
        error: error.message,
        businessId
      });
      throw error;
    }
  }

  /**
   * List all businesses with pagination
   * @param {Object} queryParams - Query parameters for filtering and pagination
   * @returns {Promise<Object>} List of businesses
   */
  async listBusinesses(queryParams) {
    try {
      // Build query
      let query = supabase
        .from('businesses')
        .select('id, business_name, owner_name, phone_number, area_code, is_active, created_at')
        .order('created_at', { ascending: false });

      // Apply filters
      if (queryParams.is_active !== undefined) {
        query = query.eq('is_active', queryParams.is_active === 'true');
      }

      // Apply pagination
      const limit = parseInt(queryParams.limit) || 50;
      const offset = parseInt(queryParams.offset) || 0;
      
      query = query.range(offset, offset + limit - 1);

      const { data: businesses, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch businesses: ${error.message}`);
      }

      // Get total count for pagination
      const { count: totalCount, error: countError } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        logger.warn('Failed to get total business count', { error: countError.message });
      }

      return {
        success: true,
        businesses: businesses || [],
        pagination: {
          limit,
          offset,
          total: totalCount || 0,
          has_more: (offset + limit) < (totalCount || 0)
        }
      };

    } catch (error) {
      logger.error('Failed to list businesses', {
        error: error.message,
        queryParams
      });
      throw error;
    }
  }
}

module.exports = new BusinessController();

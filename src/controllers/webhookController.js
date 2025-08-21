const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { supabase } = require('../config/database');
const { extractCallInformation } = require('../utils/informationExtractor');
const notificationService = require('../services/notificationService');

/**
 * Webhook Controller for handling Retell AI events
 */
class WebhookController {
  /**
   * Handle Retell AI webhook for call events
   * @param {Object} webhookData - Webhook payload from Retell AI
   * @returns {Promise<Object>} Processing result
   */
  async handleRetellWebhook(webhookData) {
    try {
      logger.info('Processing Retell AI webhook', {
        callId: webhookData.call_id,
        eventType: webhookData.event_type,
        toNumber: webhookData.to_number
      });

      // Find business by phone number (faster than agent ID lookup)
      const business = await this.findBusinessByPhoneNumber(webhookData.to_number);
      if (!business) {
        throw new Error(`Business not found for phone number: ${webhookData.to_number}`);
      }

      // Handle different webhook event types
      let result;
      switch (webhookData.event_type) {
        case 'call_started':
          result = await this.handleCallStarted(webhookData, business);
          break;
        case 'call_ended':
          result = await this.handleCallEnded(webhookData, business);
          break;
        case 'call_analyzed':
          result = await this.handleCallAnalyzed(webhookData, business);
          break;
        default:
          // Handle legacy webhook format (call_status based)
          result = await this.handleLegacyWebhook(webhookData, business);
          break;
      }

      logger.info('Webhook processed successfully', {
        callId: webhookData.call_id,
        eventType: webhookData.event_type,
        businessId: business.id,
        result: result
      });

      return result;

    } catch (error) {
      logger.error('Failed to process webhook', {
        error: error.message,
        webhookData,
        stack: error.stack
      });

      // Log failed webhook attempt
      await this.logFailedWebhook(webhookData, error.message);

      throw error;
    }
  }

  /**
   * Handle call started event
   * @param {Object} webhookData - Webhook data
   * @param {Object} business - Business data
   * @returns {Promise<Object>} Processing result
   */
  async handleCallStarted(webhookData, business) {
    try {
      logger.info('Processing call started event', {
        callId: webhookData.call_id,
        businessId: business.id
      });

      // Create initial call record
      const callRecord = await this.createOrUpdateCall(webhookData, business.id, {}, 'in-progress');

      // Update analytics for call start
      await this.updateCallAnalytics(business.id, false, 'started');

      return {
        success: true,
        call_id: callRecord.id,
        business_id: business.id,
        event_type: 'call_started',
        message: 'Call started successfully'
      };

    } catch (error) {
      logger.error('Failed to handle call started', {
        error: error.message,
        callId: webhookData.call_id
      });
      throw error;
    }
  }

  /**
   * Handle call ended event
   * @param {Object} webhookData - Webhook data
   * @param {Object} business - Business data
   * @returns {Promise<Object>} Processing result
   */
  async handleCallEnded(webhookData, business) {
    try {
      logger.info('Processing call ended event', {
        callId: webhookData.call_id,
        businessId: business.id
      });

      // Update call status to completed
      const callRecord = await this.updateCallStatus(webhookData.call_id, 'completed');

      // Update analytics for call completion
      await this.updateCallAnalytics(business.id, true, 'completed');

      return {
        success: true,
        call_id: callRecord.id,
        business_id: business.id,
        event_type: 'call_ended',
        message: 'Call ended successfully'
      };

    } catch (error) {
      logger.error('Failed to handle call ended', {
        error: error.message,
        callId: webhookData.call_id
      });
      throw error;
    }
  }

  /**
   * Handle call analyzed event (final event with transcript)
   * @param {Object} webhookData - Webhook data
   * @param {Object} business - Business data
   * @returns {Promise<Object>} Processing result
   */
  async handleCallAnalyzed(webhookData, business) {
    try {
      logger.info('Processing call analyzed event', {
        callId: webhookData.call_id,
        businessId: business.id
      });

      // Extract information from transcript
      let extractedInfo = {};
      let transcriptText = webhookData.transcript || 
                          webhookData.transcript_text || 
                          webhookData.conversation || 
                          webhookData.call_summary ||
                          webhookData.summary;
      
      if (transcriptText) {
        logger.info('Processing transcript from call analyzed event', {
          callId: webhookData.call_id,
          transcriptLength: transcriptText.length
        });
        
        extractedInfo = extractCallInformation(transcriptText);
        logger.info('Information extracted from transcript', {
          callId: webhookData.call_id,
          extractedInfo
        });
      } else {
        logger.warn('No transcript available in call analyzed event', {
          callId: webhookData.call_id
        });
      }

      // Update call record with extracted information
      const callRecord = await this.createOrUpdateCall(webhookData, business.id, extractedInfo, 'completed');

      // Send notifications since call is now complete with transcript
      let notificationResult = null;
      if (extractedInfo.call_summary) {
        notificationResult = await notificationService.sendAllNotifications(callRecord, business);
        
        // Update call record with notification status
        await this.updateCallNotificationStatus(callRecord.id, notificationResult.overall.success);
      }

      return {
        success: true,
        call_id: callRecord.id,
        business_id: business.id,
        event_type: 'call_analyzed',
        notifications_sent: notificationResult?.overall.success || false,
        extracted_info: extractedInfo,
        message: 'Call analyzed and notifications sent'
      };

    } catch (error) {
      logger.error('Failed to handle call analyzed', {
        error: error.message,
        callId: webhookData.call_id
      });
      throw error;
    }
  }

  /**
   * Handle legacy webhook format (call_status based)
   * @param {Object} webhookData - Webhook data
   * @param {Object} business - Business data
   * @returns {Promise<Object>} Processing result
   */
  async handleLegacyWebhook(webhookData, business) {
    try {
      logger.info('Processing legacy webhook format', {
        callId: webhookData.call_id,
        callStatus: webhookData.call_status,
        businessId: business.id
      });

      // Extract information from transcript if call completed
      let extractedInfo = {};
      
      let transcriptText = webhookData.transcript || 
                          webhookData.transcript_text || 
                          webhookData.conversation || 
                          webhookData.call_summary ||
                          webhookData.summary;
      
      if (webhookData.call_status === 'completed' && transcriptText) {
        logger.info('Processing completed call with transcript', {
          callId: webhookData.call_id,
          transcriptLength: transcriptText.length
        });
        
        extractedInfo = extractCallInformation(transcriptText);
        logger.info('Information extracted from transcript', {
          callId: webhookData.call_id,
          extractedInfo
        });
      } else {
        logger.warn('No transcript available for extraction', {
          callId: webhookData.call_id,
          callStatus: webhookData.call_status,
          hasTranscript: !!transcriptText
        });
      }

      // Create or update call record
      const callRecord = await this.createOrUpdateCall(webhookData, business.id, extractedInfo, webhookData.call_status);

      // Send notifications if call completed
      let notificationResult = null;
      if (webhookData.call_status === 'completed') {
        notificationResult = await notificationService.sendAllNotifications(callRecord, business);
        
        // Update call record with notification status
        await this.updateCallNotificationStatus(callRecord.id, notificationResult.overall.success);
      }

      // Update analytics
      await this.updateCallAnalytics(business.id, webhookData.call_status === 'completed');

      return {
        success: true,
        call_id: callRecord.id,
        business_id: business.id,
        notifications_sent: notificationResult?.overall.success || false,
        extracted_info: extractedInfo
      };

    } catch (error) {
      logger.error('Failed to handle legacy webhook', {
        error: error.message,
        callId: webhookData.call_id
      });
      throw error;
    }
  }

  /**
   * Find business by phone number (optimized lookup)
   * @param {string} phoneNumber - Phone number being called
   * @returns {Promise<Object|null>} Business data or null
   */
  async findBusinessByPhoneNumber(phoneNumber) {
    try {
      // Normalize phone number for comparison
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('phone_number', normalizedPhone)
        .eq('is_active', true)
        .single();

      if (error) {
        logger.error('Error finding business by phone number', {
          error: error.message,
          phoneNumber: normalizedPhone
        });
        return null;
      }

      logger.info('Business found by phone number', {
        businessId: data.id,
        businessName: data.business_name,
        phoneNumber: normalizedPhone
      });

      return data;
    } catch (error) {
      logger.error('Exception finding business by phone number', {
        error: error.message,
        phoneNumber
      });
      return null;
    }
  }

  /**
   * Normalize phone number for consistent comparison
   * @param {string} phoneNumber - Raw phone number
   * @returns {string} Normalized phone number
   */
  normalizePhoneNumber(phoneNumber) {
    if (!phoneNumber) return null;
    
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Handle different formats
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    } else if (cleaned.length === 11) {
      return `+${cleaned}`;
    } else {
      return `+${cleaned}`;
    }
  }

  /**
   * Create or update call record
   * @param {Object} webhookData - Webhook data from Retell AI
   * @param {string} businessId - Business ID
   * @param {Object} extractedInfo - Extracted caller information
   * @param {string} callStatus - Status of the call (e.g., 'completed', 'in-progress')
   * @returns {Promise<Object>} Call record
   */
  async createOrUpdateCall(webhookData, businessId, extractedInfo, callStatus) {
    try {
      // Get transcript text from webhook data
      const transcriptText = webhookData.transcript || 
                            webhookData.transcript_text || 
                            webhookData.conversation || 
                            webhookData.call_summary ||
                            webhookData.summary;
      
      const callData = {
        business_id: businessId,
        caller_name: extractedInfo.name,
        callback_number: extractedInfo.callback_number,
        address: extractedInfo.address,
        reason: extractedInfo.reason,
        call_summary: extractedInfo.call_summary,
        recording_url: webhookData.recording_url,
        transcript_text: transcriptText,
        duration: webhookData.call_duration || 0,
        call_status: callStatus, // Use the provided callStatus
        from_number: webhookData.from_number,
        to_number: webhookData.to_number,
        // Calculate cost based on duration (Retell AI pricing: $0.091/minute)
        cost: webhookData.call_duration ? (webhookData.call_duration / 60) * 0.091 : 0
      };

      // Check if call already exists (update) or create new
      const { data: existingCall, error: fetchError } = await supabase
        .from('calls')
        .select('id')
        .eq('id', webhookData.call_id)
        .single();

      let result;
      if (existingCall && !fetchError) {
        // Update existing call
        const { data, error } = await supabase
          .from('calls')
          .update(callData)
          .eq('id', webhookData.call_id)
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to update call: ${error.message}`);
        }

        result = data;
        logger.info('Call record updated', { callId: webhookData.call_id });
      } else {
        // Create new call with webhook call_id
        const { data, error } = await supabase
          .from('calls')
          .insert({
            id: webhookData.call_id, // Use Retell AI call ID
            ...callData
          })
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to create call: ${error.message}`);
        }

        result = data;
        logger.info('Call record created', { callId: webhookData.call_id });
      }

      return result;

    } catch (error) {
      logger.error('Error creating/updating call record', {
        error: error.message,
        webhookData,
        businessId
      });
      throw error;
    }
  }

  /**
   * Update call status
   * @param {string} callId - Call ID
   * @param {string} status - New status (e.g., 'completed', 'in-progress')
   * @returns {Promise<Object>} Updated call record
   */
  async updateCallStatus(callId, status) {
    try {
      const { data, error } = await supabase
        .from('calls')
        .update({ call_status: status })
        .eq('id', callId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update call status: ${error.message}`);
      }
      logger.info('Call status updated', { callId, status });
      return data;
    } catch (error) {
      logger.error('Exception updating call status', {
        error: error.message,
        callId,
        status
      });
      throw error;
    }
  }

  /**
   * Update call notification status
   * @param {string} callId - Call ID
   * @param {boolean} notificationSent - Whether notifications were sent successfully
   * @returns {Promise<void>}
   */
  async updateCallNotificationStatus(callId, notificationSent) {
    try {
      const { error } = await supabase
        .from('calls')
        .update({ notification_sent: notificationSent })
        .eq('id', callId);

      if (error) {
        logger.error('Failed to update call notification status', {
          error: error.message,
          callId
        });
      }
    } catch (error) {
      logger.error('Exception updating call notification status', {
        error: error.message,
        callId
      });
    }
  }

  /**
   * Update call analytics for business
   * @param {string} businessId - Business ID
   * @param {boolean} callCompleted - Whether call was completed successfully
   * @param {string} eventType - Type of event (e.g., 'started', 'completed')
   * @returns {Promise<void>}
   */
  async updateCallAnalytics(businessId, callCompleted, eventType) {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Get or create analytics record for today
      const { data: existingAnalytics, error: fetchError } = await supabase
        .from('call_analytics')
        .select('*')
        .eq('business_id', businessId)
        .eq('date', today)
        .single();

      if (existingAnalytics && !fetchError) {
        // Update existing record
        const updates = {
          total_calls: existingAnalytics.total_calls + 1
        };

        if (eventType === 'completed') {
          updates.successful_notifications = existingAnalytics.successful_notifications + 1;
        } else if (eventType === 'started') {
          updates.total_calls = existingAnalytics.total_calls + 1; // Count started calls
        }

        const { error } = await supabase
          .from('call_analytics')
          .update(updates)
          .eq('id', existingAnalytics.id);

        if (error) {
          logger.error('Failed to update call analytics', {
            error: error.message,
            businessId,
            date: today
          });
        }
      } else {
        // Create new record
        const analyticsData = {
          business_id: businessId,
          date: today,
          total_calls: 1,
          successful_notifications: eventType === 'completed' ? 1 : 0,
          failed_notifications: eventType === 'completed' ? 0 : 1
        };

        const { error } = await supabase
          .from('call_analytics')
          .insert(analyticsData);

        if (error) {
          logger.error('Failed to create call analytics', {
            error: error.message,
            businessId,
            date: today
          });
        }
      }
    } catch (error) {
      logger.error('Exception updating call analytics', {
        error: error.message,
        businessId
      });
    }
  }

  /**
   * Log failed webhook processing
   * @param {Object} webhookData - Original webhook data
   * @param {string} errorMessage - Error message
   * @returns {Promise<void>}
   */
  async logFailedWebhook(webhookData, errorMessage) {
    try {
      // This could be expanded to store failed webhooks for retry processing
      logger.error('Failed webhook logged', {
        webhookData,
        errorMessage,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to log failed webhook', {
        error: error.message,
        webhookData
      });
    }
  }
}

module.exports = new WebhookController();

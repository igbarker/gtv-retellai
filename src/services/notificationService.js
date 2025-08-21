const axios = require('axios');
const logger = require('../utils/logger');
const { supabase } = require('../config/database');

/**
 * Notification Service for Slack (SMS handled by Retell AI)
 */
class NotificationService {
  /**
   * Send SMS notification to business owner
   * Note: SMS is handled automatically by Retell AI
   * @param {Object} callData - Call information
   * @param {Object} businessData - Business information
   * @returns {Promise<Object>} Notification result
   */
  async sendSMSNotification(callData, businessData) {
    try {
      // Retell AI handles SMS automatically - we just log it
      logger.info('SMS notification handled by Retell AI', {
        callId: callData.id,
        to: businessData.owner_phone,
        businessName: businessData.business_name
      });

      // Log notification as sent (since Retell AI handles it)
      await this.logNotification(callData.id, 'sms', 'sent', businessData.owner_phone);

      return {
        success: true,
        status: 'sent',
        note: 'SMS handled by Retell AI'
      };

    } catch (error) {
      logger.error('SMS notification logging failed', {
        error: error.message,
        callId: callData.id,
        phone: businessData.owner_phone
      });

      return {
        success: false,
        error: error.message,
        status: 'failed'
      };
    }
  }

  /**
   * Send Slack notification
   * @param {Object} callData - Call information
   * @param {Object} businessData - Business information
   * @returns {Promise<Object>} Notification result
   */
  async sendSlackNotification(callData, businessData) {
    try {
      if (!businessData.slack_webhook_url) {
        logger.warn('No Slack webhook URL configured for business', {
          businessId: businessData.id,
          callId: callData.id
        });
        return {
          success: false,
          error: 'No Slack webhook configured',
          status: 'skipped'
        };
      }

      const message = this.formatSlackMessage(callData, businessData);
      
      const response = await axios.post(businessData.slack_webhook_url, message, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });

      if (response.status === 200) {
        logger.info('Slack notification sent successfully', {
          callId: callData.id,
          businessId: businessData.id
        });

        // Log notification
        await this.logNotification(callData.id, 'slack', 'sent', businessData.slack_webhook_url);

        return {
          success: true,
          status: 'sent'
        };
      } else {
        throw new Error(`Slack API returned status ${response.status}`);
      }

    } catch (error) {
      logger.error('Slack notification failed', {
        error: error.message,
        callId: callData.id,
        businessId: businessData.id
      });

      // Log failed notification
      await this.logNotification(
        callData.id, 
        'slack', 
        'failed', 
        businessData.slack_webhook_url, 
        error.message
      );

      return {
        success: false,
        error: error.message,
        status: 'failed'
      };
    }
  }

  /**
   * Send both SMS and Slack notifications
   * @param {Object} callData - Call information
   * @param {Object} businessData - Business information
   * @returns {Promise<Object>} Combined notification results
   */
  async sendAllNotifications(callData, businessData) {
    const results = {
      sms: null,
      slack: null,
      overall: { success: false, errors: [] }
    };

    try {
      // Send SMS notification (handled by Retell AI)
      results.sms = await this.sendSMSNotification(callData, businessData);
      
      // Send Slack notification
      results.slack = await this.sendSlackNotification(callData, businessData);

      // Determine overall success
      const smsSuccess = results.sms.success;
      const slackSuccess = results.slack.success || results.slack.status === 'skipped';
      
      results.overall.success = smsSuccess && slackSuccess;
      
      if (!smsSuccess) {
        results.overall.errors.push(`SMS: ${results.sms.error}`);
      }
      if (!results.slack.success && results.slack.status !== 'skipped') {
        results.overall.errors.push(`Slack: ${results.slack.error}`);
      }

      logger.info('All notifications processed', {
        callId: callData.id,
        smsSuccess: results.sms.success,
        slackSuccess: results.slack.success,
        overallSuccess: results.overall.success
      });

    } catch (error) {
      logger.error('Error sending notifications', {
        error: error.message,
        callId: callData.id
      });
      results.overall.errors.push(`General: ${error.message}`);
    }

    return results;
  }

  /**
   * Format Slack message
   * @param {Object} callData - Call information
   * @param {Object} businessData - Business information
   * @returns {Object} Formatted Slack message
   */
  formatSlackMessage(callData, businessData) {
    const timestamp = new Date(callData.created_at).toLocaleString();
    
    return {
      text: `New call for ${businessData.business_name}`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `${callData.call_summary || 'Customer inquiry'} - ${businessData.business_name}`
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Name:* ${callData.caller_name || 'Not provided'}`
            },
            {
              type: "mrkdwn",
              text: `*Callback:* ${callData.callback_number || 'Not provided'}`
            },
            {
              type: "mrkdwn",
              text: `*Address:* ${callData.address || 'Not provided'}`
            },
            {
              type: "mrkdwn",
              text: `*Reason:* ${callData.reason || 'Not provided'}`
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Recording:* ${callData.recording_url ? `<${callData.recording_url}|Download Audio>` : 'Not available'}`
          }
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `⏰ ${timestamp} | 📞 Call ID: ${callData.id}`
            }
          ]
        }
      ]
    };
  }

  /**
   * Log notification attempt to database
   * @param {string} callId - Call ID
   * @param {string} type - Notification type (sms/slack)
   * @param {string} status - Status (sent/failed/pending)
   * @param {string} recipient - Recipient information
   * @param {string} errorMessage - Error message if failed
   * @returns {Promise<void>}
   */
  async logNotification(callId, type, status, recipient, errorMessage = null) {
    try {
      const { error } = await supabase
        .from('notification_logs')
        .insert({
          call_id: callId,
          notification_type: type,
          status: status,
          recipient: recipient,
          error_message: errorMessage
        });

      if (error) {
        logger.error('Failed to log notification', {
          error: error.message,
          callId,
          type,
          status
        });
      }
    } catch (error) {
      logger.error('Error logging notification', {
        error: error.message,
        callId,
        type,
        status
      });
    }
  }

  /**
   * Retry failed notifications
   * @param {string} notificationId - Notification log ID
   * @returns {Promise<Object>} Retry result
   */
  async retryNotification(notificationId) {
    try {
      // Get notification details
      const { data: notification, error: fetchError } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('id', notificationId)
        .single();

      if (fetchError || !notification) {
        throw new Error('Notification not found');
      }

      if (notification.retry_count >= notification.max_retries) {
        throw new Error('Max retries exceeded');
      }

      // Get call and business data
      const { data: call, error: callError } = await supabase
        .from('calls')
        .select('*, businesses(*)')
        .eq('id', notification.call_id)
        .single();

      if (callError || !call) {
        throw new Error('Call not found');
      }

      // Retry notification
      let result;
      if (notification.notification_type === 'sms') {
        result = await this.sendSMSNotification(call, call.businesses);
      } else if (notification.notification_type === 'slack') {
        result = await this.sendSlackNotification(call, call.businesses);
      }

      // Update retry count
      await supabase
        .from('notification_logs')
        .update({
          retry_count: notification.retry_count + 1,
          status: result.success ? 'sent' : 'failed',
          error_message: result.success ? null : result.error
        })
        .eq('id', notificationId);

      return result;

    } catch (error) {
      logger.error('Failed to retry notification', {
        error: error.message,
        notificationId
      });
      throw error;
    }
  }
}

module.exports = new NotificationService();

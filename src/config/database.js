const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

// Create Supabase client (will be null if env vars are missing)
let supabase = null;

// Check for required environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length === 0) {
  // Create Supabase client with latest configuration
  try {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        // Add latest Supabase options
        global: {
          headers: {
            'X-Client-Info': 'ai-receptionist-mvp'
          }
        }
      }
    );
    
    // Database client created - no logging during startup for speed
  } catch (error) {
    logger.error('Failed to create Supabase client:', error.message);
    supabase = null;
  }
}

// Test database connection
async function testConnection() {
  if (!supabase) {
    logger.warn('Cannot test database connection - Supabase not configured');
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('count')
      .limit(1);
    
    if (error) {
      logger.error('Database connection test failed:', error);
      throw error;
    }
    
    logger.info('Database connection successful');
    return true;
  } catch (error) {
    logger.error('Database connection test failed:', error);
    return false;
  }
}

// Get database status
function getDatabaseStatus() {
  return {
    configured: !!supabase,
    url: process.env.SUPABASE_URL ? 'Configured' : 'Missing',
    serviceKey: process.env.SUPABASE_SERVICE_KEY ? 'Configured' : 'Missing',
    client: !!supabase
  };
}

module.exports = {
  supabase,
  testConnection,
  getDatabaseStatus
};

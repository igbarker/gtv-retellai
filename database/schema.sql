-- AI Receptionist MVP Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Businesses (customers of the platform)
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255) NOT NULL,
  owner_phone VARCHAR(20) NOT NULL,
  slack_webhook_url TEXT,
  retell_agent_id VARCHAR(100) UNIQUE NOT NULL,
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  custom_prompt TEXT,
  fallback_message TEXT DEFAULT 'Thank you for calling. Our office is currently closed. Please leave a message and we will get back to you during business hours.',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Call records
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  caller_name VARCHAR(255),
  callback_number VARCHAR(20),
  address TEXT,
  reason TEXT,
  call_summary TEXT,
  recording_url TEXT,
  transcript_text TEXT,
  duration INTEGER, -- in seconds
  cost DECIMAL(10,4),
  call_status VARCHAR(20) DEFAULT 'completed', -- 'completed', 'failed', 'in-progress'
  notification_sent BOOLEAN DEFAULT false,
  from_number VARCHAR(20),
  to_number VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification tracking
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
  notification_type VARCHAR(20) NOT NULL, -- 'sms' or 'slack'
  status VARCHAR(20) DEFAULT 'pending', -- 'sent', 'failed', 'pending'
  recipient VARCHAR(255),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business configurations and settings
CREATE TABLE business_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id, setting_key)
);

-- Call analytics and metrics
CREATE TABLE call_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_calls INTEGER DEFAULT 0,
  total_duration INTEGER DEFAULT 0, -- in seconds
  total_cost DECIMAL(10,4) DEFAULT 0,
  successful_notifications INTEGER DEFAULT 0,
  failed_notifications INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id, date)
);

-- Indexes for performance
CREATE INDEX idx_businesses_phone_number ON businesses(phone_number);
CREATE INDEX idx_calls_business_id ON calls(calls.business_id);
CREATE INDEX idx_calls_created_at ON calls(created_at);
CREATE INDEX idx_calls_status ON calls(call_status);
CREATE INDEX idx_notification_logs_call_id ON notification_logs(call_id);
CREATE INDEX idx_notification_logs_status ON notification_logs(status);
CREATE INDEX idx_call_analytics_business_date ON call_analytics(business_id, date);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_logs_updated_at BEFORE UPDATE ON notification_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_call_analytics_updated_at BEFORE UPDATE ON call_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access
CREATE POLICY "Service role can access all data" ON businesses FOR ALL USING (true);
CREATE POLICY "Service role can access all data" ON calls FOR ALL USING (true);
CREATE POLICY "Service role can access all data" ON notification_logs FOR ALL USING (true);
CREATE POLICY "Service role can access all data" ON business_settings FOR ALL USING (true);
CREATE POLICY "Service role can access all data" ON call_analytics FOR ALL USING (true);

-- Comments for documentation
COMMENT ON TABLE businesses IS 'Business customers using the AI receptionist service';
COMMENT ON TABLE calls IS 'Individual call records with extracted information';
COMMENT ON TABLE notification_logs IS 'Tracking of SMS and Slack notifications sent';
COMMENT ON TABLE business_settings IS 'Configurable settings per business';
COMMENT ON TABLE call_analytics IS 'Daily aggregated call metrics per business';

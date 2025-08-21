-- Default Business Settings
-- Run this AFTER creating your first business to set up default settings

-- Function to create default settings for a new business
CREATE OR REPLACE FUNCTION create_default_business_settings(business_uuid UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO business_settings (business_id, setting_key, setting_value) VALUES
        (business_uuid, 'max_call_duration', '900'), -- 15 minutes in seconds
        (business_uuid, 'notification_retry_delay', '300'), -- 5 minutes in seconds
        (business_uuid, 'cost_alert_threshold', '50.00'); -- $50 cost alert threshold
END;
$$ LANGUAGE plpgsql;

-- Example usage (replace 'your-business-id-here' with actual business ID):
-- SELECT create_default_business_settings('your-business-id-here');

-- Or if you want to add default settings to all existing businesses:
-- INSERT INTO business_settings (business_id, setting_key, setting_value)
-- SELECT 
--     b.id,
--     'max_call_duration',
--     '900'
-- FROM businesses b
-- WHERE NOT EXISTS (
--     SELECT 1 FROM business_settings bs 
--     WHERE bs.business_id = b.id AND bs.setting_key = 'max_call_duration'
-- );

-- INSERT INTO business_settings (business_id, setting_key, setting_value)
-- SELECT 
--     b.id,
--     'notification_retry_delay',
--     '300'
-- FROM businesses b
-- WHERE NOT EXISTS (
--     SELECT 1 FROM business_settings bs 
--     WHERE bs.business_id = b.id AND bs.setting_key = 'notification_retry_delay'
-- );

-- INSERT INTO business_settings (business_id, setting_key, setting_value)
-- SELECT 
--     b.id,
--     'cost_alert_threshold',
--     '50.00'
-- FROM businesses b
-- WHERE NOT EXISTS (
--     SELECT 1 FROM business_settings bs 
--     WHERE bs.business_id = b.id AND bs.setting_key = 'cost_alert_threshold'
-- );

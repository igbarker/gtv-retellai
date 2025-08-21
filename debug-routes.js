// Debug script to test route imports
require('dotenv').config();

console.log('Testing route imports...');

try {
  console.log('1. Testing webhook routes...');
  const webhookRoutes = require('./src/routes/webhooks');
  console.log('   webhookRoutes type:', typeof webhookRoutes);
  console.log('   webhookRoutes is router:', webhookRoutes && typeof webhookRoutes.use === 'function');
  console.log('   webhookRoutes:', webhookRoutes);
} catch (e) {
  console.log('   ✗ webhookRoutes failed:', e.message);
  console.log('   Stack:', e.stack);
}

try {
  console.log('2. Testing business routes...');
  const businessRoutes = require('./src/routes/businesses');
  console.log('   businessRoutes type:', typeof businessRoutes);
  console.log('   businessRoutes is router:', businessRoutes && typeof businessRoutes.use === 'function');
  console.log('   businessRoutes:', businessRoutes);
} catch (e) {
  console.log('   ✗ businessRoutes failed:', e.message);
  console.log('   Stack:', e.stack);
}

try {
  console.log('3. Testing health routes...');
  const healthRoutes = require('./src/routes/health');
  console.log('   healthRoutes type:', typeof healthRoutes);
  console.log('   healthRoutes is router:', healthRoutes && typeof healthRoutes.use === 'function');
  console.log('   healthRoutes:', healthRoutes);
} catch (e) {
  console.log('   ✗ healthRoutes failed:', e.message);
  console.log('   Stack:', e.stack);
}

console.log('Debug complete.');

// Test phone number lookup functionality
const { normalizePhoneNumber } = require('./src/controllers/webhookController');

// Test cases for phone number normalization
const testCases = [
  {
    input: '+15551234567',
    expected: '+15551234567'
  },
  {
    input: '5551234567',
    expected: '+15551234567'
  },
  {
    input: '(555) 123-4567',
    expected: '+15551234567'
  },
  {
    input: '555-123-4567',
    expected: '+15551234567'
  },
  {
    input: '15551234567',
    expected: '+15551234567'
  },
  {
    input: '1-555-123-4567',
    expected: '+15551234567'
  }
];

console.log('🧪 Testing Phone Number Normalization\n');

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}:`);
  console.log(`Input: "${testCase.input}"`);
  
  try {
    // Extract the normalizePhoneNumber function from the controller
    const controller = require('./src/controllers/webhookController');
    const result = controller.normalizePhoneNumber(testCase.input);
    
    console.log(`Output: "${result}"`);
    console.log(`Expected: "${testCase.expected}"`);
    console.log(`Match: ${result === testCase.expected ? '✅' : '❌'}`);
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
  console.log('---\n');
});

console.log('✅ Test completed!');

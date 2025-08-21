/**
 * Information extraction utility for parsing call transcripts
 */

/**
 * Extract caller information from transcript text
 * @param {string} transcript - Full conversation transcript
 * @returns {Object} Extracted information object
 */
function extractCallInformation(transcript) {
  if (!transcript || typeof transcript !== 'string') {
    return {
      name: null,
      callback_number: null,
      address: null,
      reason: null,
      call_summary: null
    };
  }

  // Clean transcript for better matching
  const cleanTranscript = transcript.toLowerCase().replace(/\s+/g, ' ');

  // Extract caller name
  const name = extractName(cleanTranscript);
  
  // Extract callback phone number
  const callback_number = extractPhoneNumber(cleanTranscript);
  
  // Extract address
  const address = extractAddress(cleanTranscript);
  
  // Extract reason for call
  const reason = extractReason(cleanTranscript);
  
  // Create concise summary from reason
  const call_summary = createCallSummary(reason);

  return {
    name,
    callback_number,
    address,
    reason,
    call_summary
  };
}

/**
 * Create a concise call summary (approximately 10 words)
 * @param {string} reason - Reason for call
 * @returns {string} Concise summary
 */
function createCallSummary(reason) {
  if (!reason) {
    return 'Customer inquiry';
  }
  
  // Split into words and limit to approximately 10 words
  const words = reason.split(' ').filter(word => word.length > 0);
  
  if (words.length <= 10) {
    return reason;
  }
  
  // Take first 10 words and add ellipsis if truncated
  const summary = words.slice(0, 10).join(' ');
  return summary + '...';
}

/**
 * Extract caller name from transcript
 * @param {string} transcript - Cleaned transcript text
 * @returns {string|null} Extracted name or null
 */
function extractName(transcript) {
  // Look for name in the confirmation section
  const confirmationMatch = transcript.match(/(?:information:)\s+([a-z\s]+?)(?:\s|,|\.|$)/i);
  if (confirmationMatch && confirmationMatch[1]) {
    const name = confirmationMatch[1].trim();
    if (name.length > 2) {
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  }

  // Look for name patterns in the conversation - capture full names
  const namePatterns = [
    /(?:my name is|i'm|i am|this is|call me)\s+([a-z\s]+?)(?:\s+and|\s+but|\s+or|,|\.|$)/i,
    /(?:name is|call me)\s+([a-z\s]+?)(?:\s+and|\s+but|\s+or|,|\.|$)/i,
    /(?:i'm|i am)\s+([a-z\s]+?)(?:\s+and|\s+but|\s+or|,|\.|$)/i,
    /(?:my name is)\s+([a-z\s]+?)(?:\s+and|\s+but|\s+or|,|\.|$)/i
  ];

  for (const pattern of namePatterns) {
    const match = transcript.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      // Filter out very short names and common words, but allow multi-word names
      if (name.length > 2 && !['the', 'and', 'but', 'for', 'with', 'is', 'a'].includes(name.toLowerCase())) {
        // Capitalize each word in the name
        const capitalizedName = name.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        return capitalizedName;
      }
    }
  }

  // Fallback: look for name in confirmation part
  const fallbackMatch = transcript.match(/name\s+([^.]+?)(?:\s|,|\.|$)/i);
  if (fallbackMatch && fallbackMatch[1]) {
    const name = fallbackMatch[1].trim();
    if (name.length > 2) {
      const capitalizedName = name.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      return capitalizedName;
    }
  }

  return null;
}

/**
 * Extract phone number from transcript
 * @param {string} transcript - Cleaned transcript text
 * @returns {string|null} Extracted phone number or null
 */
function extractPhoneNumber(transcript) {
  const phonePatterns = [
    /(?:my number is|phone number is|call me at|reach me at|my phone is)\s*([\d\s\-\(\)]+)/i,
    /(?:number is|phone is|call me at)\s*([\d\s\-\(\)]+)/i,
    /(?:it's|it is)\s*([\d\s\-\(\)]+)/i
  ];

  for (const pattern of phonePatterns) {
    const match = transcript.match(pattern);
    if (match && match[1]) {
      const phone = match[1].replace(/\D/g, '');
      // Validate phone number length (7-15 digits)
      if (phone.length >= 7 && phone.length <= 15) {
        return formatPhoneNumber(phone);
      }
    }
  }

  return null;
}

/**
 * Extract address from transcript
 * @param {string} transcript - Cleaned transcript text
 * @returns {string|null} Extracted address or null
 */
function extractAddress(transcript) {
  // More specific patterns for address extraction
  const addressPatterns = [
    /(?:i live at|my address is|located at|address is)\s+([^.]+?)(?:\s|,|\.|$)/i,
    /(?:live at)\s+([^.]+?)(?:\s|,|\.|$)/i,
    /(?:address)\s+([^.]+?)(?:\s|,|\.|$)/i,
    /(?:at)\s+([^.]+?)(?:\s|,|\.|$)/i
  ];

  for (const pattern of addressPatterns) {
    const match = transcript.match(pattern);
    if (match && match[1]) {
      const address = match[1].trim();
      // Filter out very short addresses and common words
      if (address.length > 5 && !['the', 'and', 'but', 'for', 'with'].includes(address.toLowerCase())) {
        return address.charAt(0).toUpperCase() + address.slice(1);
      }
    }
  }

  // Fallback: look for address in the confirmation part
  const confirmationMatch = transcript.match(/address\s+([^.]+?)(?:\s|,|\.|$)/i);
  if (confirmationMatch && confirmationMatch[1]) {
    const address = confirmationMatch[1].trim();
    if (address.length > 5) {
      return address.charAt(0).toUpperCase() + address.slice(1);
    }
  }

  // Look for street patterns in confirmation
  const streetMatch = transcript.match(/(?:street|avenue|road|drive|lane|way|blvd|st|ave|rd|dr|ln|blvd)\s+([^.]+?)(?:\s|,|\.|$)/i);
  if (streetMatch && streetMatch[1]) {
    const address = streetMatch[1].trim();
    if (address.length > 5) {
      return address.charAt(0).toUpperCase() + address.slice(1);
    }
  }

  return null;
}

/**
 * Extract reason for call from transcript
 * @param {string} transcript - Cleaned transcript text
 * @returns {string|null} Extracted reason or null
 */
function extractReason(transcript) {
  // Look for emergency/urgent keywords
  if (transcript.includes('emergency') || transcript.includes('urgent') || transcript.includes('storm')) {
    // Check for specific emergency services
    if (transcript.includes('plumbing') || transcript.includes('sink') || transcript.includes('water')) {
      return 'Emergency plumbing service';
    }
    if (transcript.includes('tree') || transcript.includes('branch')) {
      return 'Emergency tree removal';
    }
    if (transcript.includes('electrical') || transcript.includes('power')) {
      return 'Emergency electrical service';
    }
    return 'Emergency service request';
  }

  // Look for specific service patterns
  const servicePatterns = [
    /(?:calling about|need help with|reason for calling|i need|looking for|want to)\s*([^.]+?)(?:\s|,|\.|$)/i,
    /(?:need|want|help with)\s*([^.]+?)(?:\s|,|\.|$)/i,
    /(?:because|since)\s*([^.]+?)(?:\s|,|\.|$)/i,
    /(?:about|regarding)\s*([^.]+?)(?:\s|,|\.|$)/i,
    /(?:schedule|book|appointment)\s*([^.]+?)(?:\s|,|\.|$)/i
  ];

  for (const pattern of servicePatterns) {
    const match = transcript.match(pattern);
    if (match && match[1]) {
      const reason = match[1].trim();
      // Filter out very short reasons
      if (reason.length > 3) {
        return reason.charAt(0).toUpperCase() + reason.slice(1);
      }
    }
  }

  // Look for specific business services mentioned
  const businessServices = [
    'plumbing', 'hvac', 'electrical', 'tree removal', 'landscaping', 
    'cleaning', 'repair', 'maintenance', 'installation', 'inspection'
  ];

  for (const service of businessServices) {
    if (transcript.includes(service)) {
      if (transcript.includes('maintenance') || transcript.includes('routine')) {
        return `${service.charAt(0).toUpperCase() + service.slice(1)} maintenance`;
      }
      if (transcript.includes('repair') || transcript.includes('fix')) {
        return `${service.charAt(0).toUpperCase() + service.slice(1)} repair`;
      }
      if (transcript.includes('installation') || transcript.includes('install')) {
        return `${service.charAt(0).toUpperCase() + service.slice(1)} installation`;
      }
      return `${service.charAt(0).toUpperCase() + service.slice(1)} service`;
    }
  }

  // Fallback: look for reason in confirmation part
  const confirmationMatch = transcript.match(/(?:reason|need)\s+([^.]+?)(?:\s|,|\.|$)/i);
  if (confirmationMatch && confirmationMatch[1]) {
    const reason = confirmationMatch[1].trim();
    if (reason.length > 3) {
      return reason.charAt(0).toUpperCase() + reason.slice(1);
    }
  }

  return null;
}

/**
 * Format phone number for consistency
 * @param {string} phone - Raw phone number string
 * @returns {string} Formatted phone number
 */
function formatPhoneNumber(phone) {
  const cleaned = phone.replace(/\D/g, '');
  
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
 * Calculate confidence score for extracted information
 * @param {Object} extractedInfo - Extracted information object
 * @param {string} transcript - Original transcript
 * @returns {number} Confidence score (0-1)
 */
function calculateConfidence(extractedInfo, transcript) {
  let score = 0;
  let totalFields = 4;

  if (extractedInfo.name) score += 0.25;
  if (extractedInfo.callback_number) score += 0.25;
  if (extractedInfo.address) score += 0.25;
  if (extractedInfo.reason) score += 0.25;

  return score;
}

module.exports = {
  extractCallInformation,
  extractName,
  extractPhoneNumber,
  extractAddress,
  extractReason,
  formatPhoneNumber,
  calculateConfidence
};

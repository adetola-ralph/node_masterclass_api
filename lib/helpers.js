// Helpers for various tasks

// Dependencies
const crypto = require('crypto');
const config = require('./config');

// Helper container
const helpers = {};

// Create a SHA256 hash
helpers.hash = str => {
  const { hashingSecret } = config;
  if (typeof(str) === 'string' && str.length > 0) {
    return crypto.createHmac('sha256', hashingSecret).update(str).digest('hex');
  }

  return false;
};

// Parse a json string to an object in all cases, without throwinf
helpers.paseJsonToObject = str => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return {};
  }
};

module.exports = helpers;

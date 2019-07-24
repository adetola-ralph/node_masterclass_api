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
helpers.parseJsonToObject = str => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return {};
  }
};

// Create a string of alphanumeric characters of a given length
helpers.createRandomString = (_strLength) => {
  const strLength = typeof(_strLength) === 'number' && _strLength > 0 ? _strLength : false;

  if (strLength) {
    // Define possible characters that could go into a string
    const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz1234567890';

    // Start the final string
    let str = '';
    for (let i = 0; i < strLength; i++) {
      // Get a random character from the possibleCharacter string
      var randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
      // append to the final string
      str += randomCharacter;
    }

    // Return the final string
    return str;
  }

  return false;
};

module.exports = helpers;

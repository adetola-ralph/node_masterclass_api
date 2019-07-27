// Helpers for various tasks

// Dependencies
const crypto = require('crypto');
const config = require('./config');
const https = require('https');
const querystring = require('querystring');
const { StringDecoder } = require('string_decoder')

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

// Send an sms message via Twilio
helpers.sendTwilioSms = (_phone, _msg, callback) => {
  // Validate the params
  const phone = typeof(_phone) === 'string' && _phone.trim().length === 11 ? _phone.trim() : false;
  const msg = typeof(_msg) === 'string' && _msg.trim().length > 0 && _msg.trim().length <= 1600 ? _msg.trim() : false;
  
  if (phone && msg) {
    // Configure the request payload
    const payload = {
      From: config.twilio.fromPhone,
      To: '+234' + phone,
      Body: msg,
    };

    // Stringify the payload
    const stringPayload = querystring.stringify(payload);

    // configure the request details
    const requestDetails = {
      protocol: 'https:',
      hostname: 'api.twilio.com',
      method: 'POST',
      path: '/2010-04-01/Accounts/' + config.twilio.accountSid + '/Messages.json',
      auth: config.twilio.accountSid + ':' + config.twilio.authToken,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload)
      },
    };

    // Instatiate the request object
    const req = https.request(requestDetails, res => {
      // Get the status of the sent request
      const status = res.statusCode;

      const decoder = new StringDecoder('utf-8');
      let buffer = '';
      res.on('data', (data) => {
        buffer += decoder.write(data);
      });
      res.on('end', (data) => {
        buffer += decoder.end();

        console.log(buffer)
      });

      // Callback successfully if the request went through
      if (status === 200 || status === 201) {
        callback(false);
      } else {
        callback('Status code returned was ' + status);
      }
    });

    // Bind to the error event so it doesn't get thrown
    req.on('error', err => {
      callback(err)
    });

    // Add the payload
    req.write(stringPayload);

    // End the request
    req.end();
  } else {
    callback('Given paramaters were missing or invalid');
  }
};

module.exports = helpers;

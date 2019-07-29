/**
 * Worker related tasks
 * 
 * 
 */

// Dependcies
const fs = require('fs');
const url = require('url');
const path = require('path');
const http = require('http');
const https = require('https');

const _data = require('./data');
const helpers = require('./helpers');

// Instantiate the worker module object
const workers = {};

// Lookup all checks, get that data, send to a validator
workers.gatherAllChecks = () => {
  // Get all checks
  _data.list('checks', (err, checks) => {
    if (!err && checks && checks.length > 0) {
      checks.forEach(check => {
        // Read in the check data
        _data.read('checks', check, (err, originalChecksData) => {
          if (!err && originalChecksData) {
            // Pass it to the check validator, and let that function continue or log error as needed
            workers.validateCheckData(originalChecksData);
          } else {
            console.log("Error reading one of the check\'s data " + check);
          }
        });
      });
    } else {
      console.log("Error: could not find any checks to process");
    }
  });
};

// Sanity checking the check data
workers.validateCheckData = (_originalCheckData) => {
  const originalCheckData = typeof(_originalCheckData) === 'object' && _originalCheckData !== null ? _originalCheckData : {};
  originalCheckData.id = typeof(_originalCheckData.id) === 'string' && _originalCheckData.id.trim().length === 20 ? _originalCheckData.id : false;
  originalCheckData.userPhone = typeof(_originalCheckData.userPhone) === 'string' && _originalCheckData.userPhone.trim().length === 11 ? _originalCheckData.userPhone : false;
  originalCheckData.protocol = typeof(_originalCheckData.protocol) === 'string' && ['http', 'https'].indexOf(_originalCheckData.protocol) > -1 ? _originalCheckData.protocol : false;
  originalCheckData.url = typeof(_originalCheckData.url) === 'string' && _originalCheckData.url.trim().length > 0 ? _originalCheckData.url : false;
  originalCheckData.method = typeof(_originalCheckData.method) === 'string' && ['get', 'post', 'put', 'delete'].indexOf(_originalCheckData.method) > -1 ? _originalCheckData.method : false;
  originalCheckData.successCodes = typeof(_originalCheckData.successCodes) === 'object' && Array.isArray(_originalCheckData.successCodes) && _originalCheckData.successCodes.length > 0 ? _originalCheckData.successCodes : false;
  originalCheckData.timeoutSeconds = typeof(_originalCheckData.timeoutSeconds) === 'number' && _originalCheckData.timeoutSeconds % 1 === 0 && _originalCheckData.timeoutSeconds >= 1 && _originalCheckData.timeoutSeconds <= 5 ? _originalCheckData.timeoutSeconds : false;

  // Set the keys that may not be set if the workers have never seen this check before
  originalCheckData.state = typeof(_originalCheckData.state) === 'string' && ['up', 'down'].indexOf(_originalCheckData.state) > -1 ? _originalCheckData.state : 'down';
  originalCheckData.lastChecked = typeof(_originalCheckData.lastChecked) === 'number' && _originalCheckData.lastChecked > 0 ? _originalCheckData.lastChecked : false;

  // If all the checks pass, pass the data along to the next step in the process
  if (originalCheckData.id &&
    originalCheckData.userPhone &&
    originalCheckData.protocol &&
    originalCheckData.url &&
    originalCheckData.method &&
    originalCheckData.successCodes &&
    originalCheckData.timeoutSeconds) {
      workers.performCheck(originalCheckData);
  } else {
    console.log("Error: one of the checks is not properly formatted, skipping it");
  }
};

// perform check, send the outcome of the originalCheckData and the outcome of the check process, to the next step in the process
workers.performCheck = (originalCheckData) => {
  // Prepare the initial check outcome
  const checkOutcome = {
    error: false,
    responseCode: false,
  };

  // Mark that the outcome has not been sent yet
  let outcomeSent = false;

  // Parse the hostname and the oath out the original check ∂ata
  const parsedUrl = url.parse(`${originalCheckData.protocol}://${originalCheckData.url}`, true);
  const hostname = parsedUrl.hostname;
  // Using path and not "pathname" because we want the query string
  const path = parsedUrl.path;

  // Construct the request
  const requestDetails = {
    protocol: `${originalCheckData.protocol}:`,
    hostname,
    method: originalCheckData.method.toUpperCase(),
    path,
    timeout: originalCheckData.timeoutSeconds * 1000,
  };

  // Instantiate the request object either using the http or https module
  const _moduleToUse = originalCheckData.protocol === 'http' ? http : https;
  const request = _moduleToUse.request(requestDetails, (res) => {
    // Grab the status of the sent request
    const status = res.statusCode;
    console.log('request success')

    // Update the checkOutcome and pass the data along
    checkOutcome.responseCode = status;
    console.log(checkOutcome)

    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the erro so it doesn't get thrown
  request.on('error', err => {
    // Update the checkOutcome and pass the data along
    checkOutcome.error = { error: true, value: err };

    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the timeout event
  request.on('timeout', err => {
    // Update the checkOutcome and pass the data along
    checkOutcome.error = { error: true, value: 'timeout' };

    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // End the request
  request.end();
};

// Process the check outcome,update the check data as MSMediaKeyNeededEvent, trigger an alert if needed
// Special logic for accommodating a check that has neve been tested before (don't want alert on that one)
workers.processCheckOutcome = (originalCheckData, checkOutcome) => {
  // Decide if the check is considered up or down
  const state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';

  // Decide if an alert is warranted
  const alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

  // Update the check data
  const newCheckData = { ...originalCheckData, state, lastChecked: Date.now() };

  console.log(checkOutcome, state, alertWarranted)

  // Save the updates
  _data.update('checks', newCheckData.id, newCheckData, err => {
    if (!err) {
      // Send a new check data to the next phase in the process if needed
      if (alertWarranted) {
        workers.alertUserToStatusChange(newCheckData);
      } else {
        console.log('Check outcome has not changed, no alert needed');
      }
    } else {
      console.log('Error trying to save updates to one of the checks');
    }
  })
};

// Alert the user as to a change in theur check status
workers.alertUserToStatusChange = (newCheckData) => {
  const message = `Alert: Your check for ${newCheckData.method.toUpperCase()} ${newCheckData.protocol}://${newCheckData.url} is currently ${newCheckData.state}`;

  helpers.sendTwilioSms(newCheckData.userPhone, message, err => {
    if (!err) {
      console.log(`Suceess: User was alerted to a status change in their check via sms: ${message}`);
    } else {
      console.log('Error: Could not send the sms alert to the user who had a state change in their check');
    }
  });
};

// Timer to execute the worker-process once per minute
workers.loop = () => {
  setInterval(() => {
    workers.gatherAllChecks();
  }, 1000 * 60);
};

// Init function
workers.init = () => {
  // Execute all checks immeditely
  workers.gatherAllChecks();
  // Call the loop so the checks will execute later on
  workers.loop();
};

module.exports = workers;

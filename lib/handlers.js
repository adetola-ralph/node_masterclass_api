// Handlers

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');

// Define handlers
const handlers = {};

handlers.ping = (data, callback) => {
  // Callback a http status code and a payload object
  callback(200);
};

// Hello world handler
handlers.hello = (data, callback) => {
  const { name } = data.queryStringObject;
  callback(200, { message: `Hello and Welcome ${name || 'Stranger'}` });
};

// Users handler
handlers.users = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  const { method } = data;

  if (acceptableMethods.indexOf(method) > -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Conainter for the users subm ethod
handlers._users = {};

// Users - post
// Required fields: firstName, lastName, phone, password, tosAgreement
// Optional fields: none
handlers._users.post = (data, callback) => {
  // Check that all required fields are filled out
  const { payload } = data;
  const firstName = typeof(payload.firstName) === 'string' && payload.firstName.trim().length > 0 ? payload.firstName.trim() : false;
  const lastName = typeof(payload.lastName) === 'string' && payload.lastName.trim().length > 0 ? payload.lastName.trim() : false;
  const phone = typeof(payload.phone) === 'string' && payload.phone.trim().length === 10 ? payload.phone.trim() : false;
  const password = typeof(payload.password) === 'string' && payload.password.trim().length > 0 ? payload.password.trim() : false;
  const tosAgreement = typeof(payload.tosAgreement) === 'boolean' && payload.tosAgreement === true ? true : false;

  if (firstName && lastName && phone && password && tosAgreement) {
    // Make sure that the user doesn't exist
    _data.read('users', phone, (err, data) => {
      if (err) {
        // Hash the password
        const hashedPassword = helpers.hash(password);

        if (hashedPassword) {
          // Create the user object
          const userObject = {
            firstName,
            lastName,
            phone,
            hashedPassword,
            tosAgreement: true,
          }
  
          // Persist user to disk
          _data.create('users', phone, userObject, (err) => {
            if (!err) {
              callback(200);
            } else {
              console.log(err);
              callback(500, { Error: 'Could not create the new user' });
            }
          });
        } else {
          callback(500, {
            Error: 'Couldn\'t hash password',
          });
        }

      } else {
        // User exists
        callback(400, { Error: 'A user with that phone number already exists' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required fields' });
  }
};

// Users - get
// Required data: phone
// Optional data: none
// @TODO only let authenticated user access their user object
handlers._users.get = (data, callback) => {
  // Check that the phone number is valid
  const { queryStringObject, headers } = data;
  const phone = typeof(queryStringObject.phone) === 'string' && queryStringObject.phone.length === 10 ? queryStringObject.phone : false;

  if (phone) {
    // Get the token from the headers
    const token = typeof(headers.token) === 'string' ? headers.token : false;

    // verify te token is valid for the phone number
    handlers.tokens.verifyToken(token, phone, tokenIsValid => {
      if (tokenIsValid) {
        // Lookup user
        _data.read('users', phone, (err, returnedData) => {
          if (!err && returnedData) {
            // Remove the hashed password before sending to the requester
            delete returnedData.hashedPassword;
            callback(200, returnedData);
          } else {
            callback(404);
          }
        });
      } else {
        callback(403, { Error: 'missing required token in header or token is invalid' });
      }
    });
  } else {
    callback(400, { Error: 'Missing the required field' });
  }
};

// Users - put
// Required data: phone
// Optional data: firstname, lastname, password (at least one must be specified)
// @TODO Only let authenticated users update their own object
handlers._users.put = (data, callback) => {
  // Check for required field
  const { payload, headers } = data;
  const phone = typeof(payload.phone) === 'string' && payload.phone.length === 10 ? payload.phone : false;

  // Check for optional field
  const firstName = typeof(payload.firstName) === 'string' && payload.firstName.trim().length > 0 ? payload.firstName.trim() : false;
  const lastName = typeof(payload.lastName) === 'string' && payload.lastName.trim().length > 0 ? payload.lastName.trim() : false;
  const password = typeof(payload.password) === 'string' && payload.password.trim().length > 0 ? payload.password.trim() : false;

  // Error if the phone is valid in all cases
  if (phone) {
    const token = typeof(headers.token) === 'string' ? headers.token : false;

    handlers.tokens.verifyToken(token, phone, tokenIsValid => {
      if (tokenIsValid) {
        // Error is nothing is sent to update
        if (firstName || lastName || phone || password) {
          // Lookup the user
          _data.read('users', phone, (err, userData) => {
            if (!err && data) {
              // Update the fields necessary
              if (firstName) {
                userData = { ...userData, firstName };
              }
              if (lastName) {
                userData = { ...userData, lastName };
              }
              if (password) {
                userData = { ...userData, hashedPassword: helpers.hash(password) };
              }

              // Store the new updates
              _data.update('users', phone, userData, (error) => {
                if (!error) {
                  callback(200);
                } else {
                  console.error(error);
                  callback(500, { Error: 'Could not update the user' });
                }
              });
            } else {
              callback(400, { Error: 'Specified user doesn\'t exist' })
            }
          });
        } else {
          callback(400, { Error: 'Missing field to update' });
        }
      } else {
        callback(403, { Error: 'missing required token in header or token is invalid' });
      }
    });
  } else {
    callback(404, { Error: 'Missing required field' });
  }
};

// Users - delete
// Required data: phone
// @TODO Only let authenticated users delete their own object
// @TODO Cleanup (delete) any other data files related to this user
handlers._users.delete = (data, callback) => {
  // Check that the phone number is valid
  const { queryStringObject, headers } = data;
  const phone = typeof(queryStringObject.phone) === 'string' && queryStringObject.phone.length === 10 ? queryStringObject.phone : false;

  if (phone) {
    const token = typeof(headers.token) ? headers.token : false;

    handlers.tokens.verifyToken(token, phone, tokenIsValid => {
      if (tokenIsValid) {
        // Lookup user
        _data.read('users', phone, (err, returnedData) => {
          if (!err && returnedData) {
            _data.delete('users', phone, (err) => {
              if (!err) {
                callback(200);
              } else {
                callback(500, { Error: 'Could not delete the user' });
              }
            });
          } else {
            callback(404, { Error: 'Could not find the specified user' });
          }
        });
      } else {
        callback(403, { Error: 'missing required token in header or token is invalid' });
      }
    })
  } else {
    callback(400, { Error: 'Missing the required field' });
  }
};

// Token handler
handlers.tokens = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  const { method } = data;

  if (acceptableMethods.indexOf(method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for all the token methods
handlers._tokens = {};

// Tokens - get
// Required data: phone, password
handlers._tokens.post = (data, callback) => {
  // Check that all required fields are filled out
  const { payload } = data;
  const phone = typeof(payload.phone) === 'string' && payload.phone.trim().length === 10 ? payload.phone.trim() : false;
  const password = typeof(payload.password) === 'string' && payload.password.trim().length > 0 ? payload.password.trim() : false;

  if (phone && password) {
    // Lookup user who matched the phone number
    _data.read('users', phone, (err, userData) => {
      if (!err && userData) {
        // Hash the sent password and compare it with the password stored in the user object
        const hashedPassword = helpers.hash(password);
        if (hashedPassword === userData.hashedPassword) {
          // If valid, create a nee token with a random name. Set expiration date 1 hour in the future
          const tokenId = helpers.createRandomString(20);

          const expires = Date.now() + 1000 * 3600;
          const tokenObject = {
            phone,
            id: tokenId,
            expires,
          };

          // Store the token
          _data.create('tokens', tokenId, tokenObject, (err) => {
            if (!err) {
              callback(200, tokenObject);
            } else {
              callback(500, { Error: 'Could not create the new token' });
            }
          });
        } else {
          callback(400, { Error: 'Password did not match the specified user\'s stored password' });
        }
      } else {
        callback(404, { Error: 'Could not find the specified user' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required fields' });
  }
};

// Tokens - get
// Required data: id
// Optional data: none
handlers._tokens.get = (data, callback) => {
  // Check that the id is valid
  const { queryStringObject } = data;
  const id = typeof(queryStringObject.id) === 'string' && queryStringObject.id.length === 20 ? queryStringObject.id : false;

  if (id) {
    _data.read('tokens', id, (err, data) => {
      if (!err && data) {
        callback(200, data);
      } else {
        callback(404)
      }
    });
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};

// Token - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = (data, callback) => {
  // Check that the id is valid
  const { payload } = data;
  const id = typeof(payload.id) === 'string' && payload.id.length === 20 ? payload.id : false;
  const extend = typeof(payload.extend) === 'boolean' && payload.extend === true ? true : false;

  if (id && extend) {
    // Look up the token
    _data.read('tokens', id, (err, data) => {
      if (!err && data) {
        if (data.expires > Date.now()) {
          // Set the expiration an hour from now
          data.expires = Date.now() * 1000 * 3600;

          // Store the new updates
          _data.update('tokens', id, data, (err) => {
            if (!err) {
              callback(200);
            } else {
              callback(500, { Error: 'Coul not update the token\'s expiration' });
            }
          });
        } else {
          callback(400, { Error: 'The tken has already expired, and cannot be extended' });
        }
      } else {
        callback(404, { Error: 'Specified token does not exist' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required field(s) or field(s) are invalid' });
  }
};

// Tokens - delete
// Required data: id
// Optional data: none
handlers._tokens.delete = (data, callback) => {
   // Check that the id number is valid
   const { queryStringObject } = data;
   const id = typeof(queryStringObject.id) === 'string' && queryStringObject.id.length === 20 ? queryStringObject.id : false;
 
   if (id) {
     // Lookup token
     _data.read('tokens', id, (err, returnedData) => {
       if (!err && returnedData) {
         _data.delete('tokens', id, (err) => {
           if (!err) {
             callback(200);
           } else {
             callback(500, { Error: 'Could not delete the token' });
           }
         });
       } else {
         callback(404, { Error: 'Could not find the specified token' });
       }
     });
   } else {
     callback(400, { Error: 'Missing the required field' });
   }
};

// Verify if a given token id is valid for a given user
handlers.tokens.verifyToken = (id, phoneNumber, callback) => {
  // Lookup the token
  _data.read('tokens', id, (err, tokenData) => {
    if (!err && tokenData) {
      const { phone, expires } = tokenData;
      // check if the tojen is for given user and is not expired
      if (phone === phone && expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  })
};

handlers.checks = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  const { method } = data;

  if (acceptableMethods.indexOf(method) > -1) {
    handlers._checks[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for all the checks methods
handlers._checks = {};

// Checks - post
// Required data: protocol, url, method, successCodes, timeoutSconds
// Optional data: none
handlers._checks.post = (data, callback) => {
  // Validate input
  const { payload, headers } = data;
  const protocol = typeof(payload.protocol) === 'string' && ['http', 'https'].indexOf(payload.protocol) > -1 ? payload.protocol : false;
  const url = typeof(payload.url) === 'string' && payload.url.trim().length > 0 ? payload.url : false;
  const method = typeof(payload.method) === 'string' && ['get', 'post', 'put', 'delete'].indexOf(payload.method) > -1 ? payload.method : false;
  const successCodes = typeof(payload.successCodes) === 'object' && Array.isArray(payload.successCodes) && payload.successCodes.length > 0 ? payload.successCodes : false;
  const timeoutSeconds = typeof(payload.timeoutSeconds) === 'number' && payload.timeoutSeconds % 1 === 0 && payload.timeoutSeconds >= 1 && payload.timeoutSeconds <= 5 ? payload.timeoutSeconds : false;

  if (protocol && url && method && successCodes && timeoutSeconds) {
    // get token from header
    const token = typeof(headers.token) ? headers.token : false;

    // lookup the user by reading the token
    _data.read('tokens', token, (err, tokenData) => {
      if (!err && tokenData) {
        const userPhone = tokenData.phone;
        
        // lookup the user
        _data.read('users', userPhone, (err, userData) => {
          if (!err && userData) {
            const userChecks = typeof(userData.checks) === 'object' && Array.isArray(userData.checks) ? userData.checks : [];

            // verify that the user has less than max-checks-per-user
            if (userChecks.length < config.maxChecks) {
              // create random id for the check
              const checkId = helpers.createRandomString(20);

              // create the check object, and include the user's phone
              const checkObject = {
                id: checkId,
                userPhone,
                protocol,
                url,
                method,
                successCodes,
                timeoutSeconds,
              };

              // save the object
              _data.create('checks', checkId, checkObject, err => {
                if (!err) {
                  // save the check id to the user's object
                  userData.checks = userChecks;
                  userData.checks.push(checkId);

                  _data.update('users', userPhone, userData, err => {
                    if (!err) {
                      // return data about the check to the requester
                      callback(200, checkObject);
                    } else {
                      callback(500, { Error: 'Could not update the user with the new check' });
                    }
                  });
                } else {
                  callback(500, { Error: 'Could not create the new check' });
                }
              });
            } else {
              callback(400, { Error: 'User already has the maximum number of checks ( '+ config.maxChecks +' )' });
            }
          } else {
            callback(403, { Error: 'missing required token in header or token is invalid' });
          }
        })
      } else {
        callback(403, { Error: 'missing required token in header or token is invalid' });
      }
    });
  } else {
    callback(400, { Error: 'Missing the required inputs, or inputs are invalid' });
  }
};

// Checks - get
// Required data: id
// Optiona data: none
handlers._checks.get = (data, callback) => {
  const { queryStringObject, headers } = data;
  // Check that the id is valid
  const id = typeof(queryStringObject.id) === 'string' && queryStringObject.id.length === 20 ? queryStringObject.id : false;

  if (id) {
    // Lookup the check
    _data.read('checks', id, (err, checkData) => {
      if (!err && checkData) {
        // Get the token from the headers
        const token = typeof(headers.token) === 'string' ? headers.token : false;

        // verify the token is valid and belongs to the user who created the check
        handlers.tokens.verifyToken(token, checkData.userPhone, tokenIsValid => {
          if (tokenIsValid) {
            callback(200, checkData);
          } else {
            callback(403, { Error: 'missing required token in header or token is invalid' });
          }
        });
      } else {
        callback(404, { Error: 'Check with that Id doesn\'t exist' });
      }
    });
  } else {
    callback(400, { Error: 'Missing the required field' });
  }
};

// Not found handler
handlers.notFound = (data, callback) => {
  callback(404);
};

// Export the module
module.exports = handlers;

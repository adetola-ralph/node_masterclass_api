// Handlers

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');

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
    _data.read('user', phone, (err, data) => {
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
          _data.create('user', phone, userObject, (err) => {
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
  const { queryStringObject } = data;
  const phone = typeof(queryStringObject.phone) === 'string' && queryStringObject.phone.length === 10 ? queryStringObject.phone : false;

  if (phone) {
    // Lookup user
    _data.read('user', phone, (err, returnedData) => {
      if (!err && returnedData) {
        // Remove the hashed password before sending to the requester
        delete returnedData.hashedPassword;
        callback(200, returnedData);
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { Error: 'Missing the required field' });
  }
};

// Users - put
handlers._users.put = (data, callback) => {};

// Users - delete
handlers._users.delete = (data, callback) => {};

// Not found handler
handlers.notFound = (data, callback) => {
  callback(404);
};

// Export the module
module.exports = handlers;

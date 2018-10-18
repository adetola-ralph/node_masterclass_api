// Handlers

// Dependencies

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

// Not found handler
handlers.notFound = (data, callback) => {
  callback(404);
};

// Export the module
module.exports = handlers;

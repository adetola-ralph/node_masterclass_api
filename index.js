/**
 * Primary file for the api
 * 
 * 
 */

//  Dependencies
const server = require('./lib/server');
const workers = require('./lib/workers');

// Declare the app
var app = {};

// Initialisation function
app.init = () => {
  // Start the server
  server.init();

  // Start the workers
  workers.init();
};

// Execute the function
app.init();

// Export the app
module.exports = app

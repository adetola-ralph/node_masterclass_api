/**
 * Server related tasks
 * 
 * 
 */

// Dependencies
const fs = require('fs');
const url = require('url');
const path = require('path');
const http = require('http');
const https = require('https');
const { StringDecoder } = require('string_decoder');

// Helpers
const helpers = require('./helpers');

// Handlers
const handlers = require('./handlers');

// Get the configuration
const config = require('./config');

// Instantiate the server module object
const server = {};

// HTTP server
server.httpServer = http.createServer((req, res) => {
  server.unifiedServer(req, res);
});

// HTTPS server configuration
server.httpsServerOptions = {
  key: fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
  cert: fs.readFileSync(path.join(__dirname,'/../https/cert.pem')),
};

// HTTPS server
server.httpsServer = https.createServer(server.httpsServerOptions, (req, res) => {
  server.unifiedServer(req, res);
});

// All the server logic for hoth http and https server
server.unifiedServer = (req, res) => {

  // Get url and parse it
  const parsedUrl = url.parse(req.url, true);

  // Get path from url
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, '');

  // Get query string
  const queryStringObject = parsedUrl.query;

  // Get the HTTP method
  const method = req.method.toLowerCase();

  // Get the headers as an object
  const headers = req.headers;

  // Get the payload if any
  const decoder = new StringDecoder('utf-8');
  let buffer = '';
  req.on('data', (data) => {
    buffer += decoder.write(data);
  });

  req.on('end', () => {
    buffer += decoder.end();

    // chose the handler to handle request, use not found handler 
    // if no appropriate handler is found
    const chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

    // COnstruct a data object to send to the handler
    const data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: helpers.parseJsonToObject(buffer),
    };

    // Route the request to the handler
    chosenHandler(data, (statusCode, payload) => {
      // Use the status code called by the handler or default to 200
      statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

      // User the payload called back by the handler or default to {}
      payload = typeof(payload) == 'object' ? payload : {};

      // Convert payload to a string
      const payloadString = JSON.stringify(payload);

      // Return the response
      // Always set headers before writing the response
      res.setHeader('Content-type', 'application/json');
      res.writeHead(statusCode);
      res.end(payloadString);

      // Log what path requested for
      console.log('Returning this response ', statusCode, payloadString);
    });
  });
};

// Define a request router
server.router = {
  // Ping route registration
  ping: handlers.ping,

  // Hello world route registration
  hello: handlers.hello,

  // User route registration
  users: handlers.users,

  // Token route registration
  tokens: handlers.tokens,

  // Checks route registration
  checks: handlers.checks,
};

// Init function
server.init = () => {
  // Start the HTTP server
  server.httpServer.listen(config.httpPort, () => {
    console.log(`Http Server listening on ${config.httpPort}`);
  });

  // Start the HTTPS Server
  server.httpsServer.listen(config.httpsPort, () => {
    console.log(`Https Server listening on ${config.httpsPort}`);
  });
};

module.exports = server;

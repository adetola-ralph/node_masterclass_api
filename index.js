// Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const { StringDecoder } = require('string_decoder');
const fs = require('fs');

// Handlers
const handlers = require('./handlers');

// Get the configuration
const config = require('./config');

// HTTP server
const httpServer = http.createServer((req, res) => {
  unifiedServer(req, res);
});

// HTTPS server configuration
const httpsServerOptions = {
  key: fs.readFileSync('./https/key.pem'),
  cert: fs.readFileSync('./https/cert.pem'),
};

// HTTPS server
const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
  unifiedServer(req, res);
});

// Start the HTTP server
httpServer.listen(config.httpPort, () => {
  console.log(`Http Server listening on ${config.httpPort}`);
});

// Start the HTTPS Server
httpsServer.listen(config.httpsPort, () => {
  console.log(`Https Server listening on ${config.httpsPort}`);
});

// All the server logic for hoth http and https server
const unifiedServer = (req, res) => {

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
    const chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

    // COnstruct a data object to send to the handler
    const data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: buffer,
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

// Define a request router
const router = {
  // Ping route registration
  ping: handlers.ping,

  // Hello world route registration
  hello: handlers.hello,
}

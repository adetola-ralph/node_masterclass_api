// Dependencies
var http = require('http');
var https = require('https');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;
var fs = require('fs');

var config = require('./config');

var httpServer = http.createServer(function (req, res) {
  unifiedServer(req, res);
});

var httpsServerOptions = {
  key: fs.readFileSync('./https/key.pem'),
  cert: fs.readFileSync('./https/cert.pem'),
};

var httpsServer = https.createServer(httpsServerOptions, function (req, res) {
  unifiedServer(req, res);
});

// Start the server
httpServer.listen(config.httpPort, function () {
  console.log('Http Server listening on ' + config.httpPort);
});

httpsServer.listen(config.httpsPort, function () {
  console.log('Https Server listening on ' + config.httpsPort);
});

// All the server logic for hoth http and https server
var unifiedServer = function (req, res) {

  // Get url and parse it
  var parsedUrl = url.parse(req.url, true);

  // Get path from url
  var path = parsedUrl.pathname;
  var trimmedPath = path.replace(/^\/+|\/+$/g, '');

  // Get query string
  var queryStringObject = parsedUrl.query;

  // Get the HTTP method
  var method = req.method.toLowerCase();

  // Get the headers as an object
  var headers = req.headers;

  // Get the payload if any
  var decoder = new StringDecoder('utf-8');
  var buffer = '';
  req.on('data', function (data) {
    buffer += decoder.write(data);
  });

  req.on('end', function() {
    buffer += decoder.end();

    // chose the handler to handle request, use not found handler 
    // if no appropriate handler is found
    var chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

    // COnstruct a data object to send to the handler
    var data = {
      trimmedPath: trimmedPath,
      queryStringObject: queryStringObject,
      method: method,
      headers: headers,
      payload: buffer,
    };

    // Route the request to the handler
    chosenHandler(data, function(statusCode, payload) {
      // Use the status code called by the handler or default to 200
      statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

      // User the payload called back by the handler or default to {}
      payload = typeof(payload) == 'object' ? payload : {};

      // Convert payload to a string
      var payloadString = JSON.stringify(payload);

      // Return the response
      // Always set headers before writing
      res.setHeader('Content-type', 'application/json');
      res.writeHead(statusCode);
      res.end(payloadString);

      // Log what path requested for
      console.log('Returning this response ', statusCode, payloadString);
    });
  });
};

// Define handlers
var handlers = {};

handlers.ping = function (data, callback) {
  // Callback a http status code and a payload object
  callback(200);
};

// Hello world handler
handlers.hello = function (data, callback) {
  callback(200, {
    message: 'Hello and welcome',
  });
};

// Not found handler
handlers.notFound = function (data, callback) {
  callback(404);
};

// Define a request router
var router = {
  ping: handlers.ping,

  // hello world route registration
  hello: handlers.hello,
}

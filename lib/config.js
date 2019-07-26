// Container for all the environments
var environments = {};

// Staging (Default) environment 
environments.staging = {
  httpPort: 33331,
  httpsPort: 33341,
  envName: 'staging',
  hashingSecret: 'secret',
  maxChecks: 5,
};

// Production environment 
environments.production = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: 'production',
  hashingSecret: 'secret',
  maxChecks: 5,
};

// Determine which env to be exportedbased on the var passed on the command line
const currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check that the current environment is one of the environments above, if not default, to staging
const environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

module.exports = environmentToExport;

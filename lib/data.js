// Dependencies
const fs = require('fs');
const path = require('path');

// Container for the module
const lib = {};

// Base directory of the data folder
lib.baseDir = path.join(__dirname, '/../.data/');

// Write data to file
lib.create = (dir, file, data, callback) => {
  // Open file for writing
  // fs.open(lib.baseDir + dir + '/' +file+ '.json', 'wx', function(err, fileDescriptor){
  fs.open(`${lib.baseDir}${dir}/${file}.json`, 'wx', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      // Convert data to a string
      const stringData = JSON.stringify(data);

      // Write to a file and close it
      fs.writeFile(fileDescriptor, stringData, (err) => {
        if (!err) {
          fs.close(fileDescriptor, (err) => {
            if (!err) {
              callback(false);
            } else {
              callback("Error closing the file");
            }
          });
        } else {
          callback("Error writing to the file");
        }
      });
    } else {
      console.error(err)
      callback('Could not create new file, it may already exist');
    }
  });
};

// Read data from a file
lib.read = (dir, file, callback) => {
  fs.readFile(`${lib.baseDir}${dir}/${file}.json`, 'utf8', (error, data) => {
    callback(error, data);
  });
};

// Update existing file with data
lib.update = (dir, file, data, callback) => {
  // Open the file for writing
  fs.open(`${lib.baseDir}${dir}/${file}.json`, 'r+', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      // Convert data to a string
      const stringData = JSON.stringify(data);

      // Truncate the file
      fs.truncate(fileDescriptor, (err) => {
        if (!err) {
          // Write to file and close it
          fs.writeFile(fileDescriptor, stringData, (err) => {
            if (!err) {
              fs.close(fileDescriptor, (err) => {
                if (!err) {
                  callback(false)
                } else {
                  callback('Error closing existing file');
                }
              });
            } else {
              callback('Error writing to existing file')
            }
          })
        } else {
          callback('Error truncating file');
        }
      });
    } else {
      console.error(err)
      callback('Could not open file for reading, it may not exist yet');
    }
  });
};

// Delete an existing file
lib.delete = (dir, file, callback) => {
  fs.unlink(`${lib.baseDir}${dir}/${file}.json`, (err) => {
    if (!err) {
      callback(false);
    } else {
      callback('Error deleting existing file');
    }
  }); 
};

module.exports = lib;

const fs = require('fs');
const moment = require('moment');
const formatString = 'YYYY-MM-DD:HH:mm:ss';

function log(msg, appendToExistingLine) {
  var logString = '';
  if(!appendToExistingLine) {
    logString = logString + '\n';
  }
  var logString = logString + '[' + moment().format(formatString) + ']: ';
  if(typeof msg === 'object' || typeof msg === 'array') {
    try {
      logString = logString + JSON.stringify(msg, null, 2);
    } catch (ex) {
      logString = logString + "Failed to JSON.stringify object passed to logger.";
    }
    
  } else {
    logString = logString + msg;
  }
  var buffer = new Buffer(logString);
  fs.write(logFile, buffer, 0, buffer.length, null, function (err) {
    //ignore error
  });
}

// Setup log file
try {
  fs.unlink('ost-sound-agent.log');
} catch (ex) {
  //lol i dunno
}

fs.open('ost-sound-agent.log', 'w', function (err, fd) {
  logFile = fd;
  log('Log Initialized', true);
});

module.exports = {
  log: log
};
var express = require('express');
var bodyParser = require('body-parser');
var MPlayer = require('mplayer');
var util = require('util');
var crossFadeEasing = require('eases/cubic-out');
var Config = require("./config.js");
var fs = require('fs');

var app = express();
var config = Config.load();

try {
	var player = new MPlayer({mplayerPath: 'mplayer.exe'});
} catch (ex) {
	console.log("player init failed");
}

var manuallyStopped = false;
var queuedAssignment = null;
var currentAssignment = null;
var transitionTimeout = null;

try {
	fs.unlink('ost-sound-agent.log');
} catch (ex) {
	//lol i dunno
}

fs.writeFileSync('ost-sound-agent.log', 'Initializing Log\n', function () {});

function log(msg){
	fs.appendFile('ost-sound-agent.log', msg + "\n", function () {});
};

player.on('stop', function (status) {
	if(!manuallyStopped) {
		player.openFile(currentAssignment.trackPath);
	}
	manuallyStopped = false;
});

app.use(bodyParser.json());

app.post('/process-changed', function (req, res) {
	// log('Process Changed Request Received\n');
	// log(JSON.stringify(req.body) + '\n');
	if(!player.status.filename) {
		if(config.assignmentsMap[req.body.processName].trackPath) {
			player.openFile(config.assignmentsMap[req.body.processName].trackPath);
			currentAssignment = config.assignmentsMap[req.body.processName];
		}
	} else {
		if(!queuedAssignment || req.body.processName != queuedAssignment.processName) {
			clearTimeout(transitionTimeout);
			transitionTimeout = null;
		}
		

		if((!queuedAssignment || req.body.processName != queuedAssignment.processName) && req.body.processName != currentAssignment.processName ) {
			queuedAssignment = config.assignmentsMap[req.body.processName];
			var isPassThrough = config.passThroughsMap[req.body.processName];
			transitionTimeout = setTimeout(function () {
				if(queuedAssignment || !isPassThrough) {
					var intervalCounter = 0;
					var maxTime = config.crossFade.intervalTime * config.crossFade.intervalLoops;
					var interval = setInterval(function () {
						if(intervalCounter >= config.crossFade.intervalLoops) {
							clearInterval(interval);
							manuallyStopped = true;
							player.stop();
							if(queuedAssignment) {
								player.openFile(queuedAssignment.trackPath);
								currentAssignment = queuedAssignment;
								queuedAssignment = null;
							}
						} else {
							intervalCounter = intervalCounter + 1;
							var volume = (maxTime - (intervalCounter * config.crossFade.intervalTime))/maxTime;
							volume = crossFadeEasing(volume);
							player.volume(volume * 100);
						}
					}, config.crossFade.intervalTime); 
				}
			}, config.transitionBuffer * 1000);
		} else {
			queuedAssignment = null;
		}
	}

	res.send(JSON.stringify({success: true}));
});

app.get('/stop', function (req, res) {
	manuallyStopped = true;
	player.stop();
	res.send(JSON.stringify({success: true}));
});

app.get('/config-changed', function (req, res) {
	config = Config.load();
	res.send(JSON.stringify({success: true}));
});

app.listen(10733);
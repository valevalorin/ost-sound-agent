var express = require('express');
var bodyParser = require('body-parser');
var MPlayer = require('mplayer');
var util = require('util');
var crossFadeEasing = require('eases/cubic-out');
var Config = require("./config.js");
var fs = require('fs');

var app = express();
var config = Config.load();
var manuallyStopped = false;
var queuedAssignment = null;
var currentAssignment = null;
var transitionTimeout = null;

fs.writeFileSync('ost-sound-agent.log', 'Initializing Log\n', function () {});

function log(msg){
	fs.appendFile('ost-sound-agent.log', msg + "\n", function () {});
};

function createPlayer() {
	try {
		var p = new MPlayer({mplayerPath: 'mplayer.exe'});

		// Instead of doing this I could try using the 'loop' option available via the setOptions method (http://www.mplayerhq.hu/DOCS/tech/slave.txt for reference)
		p.on('stop', function (status) {
			if(!manuallyStopped) {
				player.openFile(currentAssignment.trackPath);
			}
			manuallyStopped = false;
		});

		// Try listening for the 'time' event, and see if it's sufficient for loop points, else try using 'sendCommands' to query the time with (get_time_pos) command
		p.on('time', function (currentTimeValue) {
			return;
			if(currentAssignment.loopEnd !== null && currentAssignment.loopEnd !== undefined) {
				if(currentTimeValue >= currentAssignment.loopEnd) {
					//seek to loop start
					if(currentAssignment.loopStart !== null && currentAssignment.loopStart !== undefined) {
						player.seek(currentAssignment.loopStart);
					} else {
						player.seek(0);
					}
				}
			}
		});

		// I have a feeling that sending (get_time_pos) to the slave will have it return the information in the save format as it does all the time meaning the 'time' event will be fired and no additional manipulation of the slave io is required

		return p;
	} catch (ex) {
		console.log("player init failed");
	}
}

var player = createPlayer();
// player.openFile('C:\\\\ost\\\\lavender_town.mp3');
var transitioningPlayer = null;

try {
	fs.unlink('ost-sound-agent.log');
} catch (ex) {
	//lol i dunno
}

app.use(bodyParser.json());

app.post('/process-changed', function (req, res) {
	log('Process Changed Request Received');
	// log(JSON.stringify(req.body) + '\n');
	if(!player.status.filename) {
		if(config.assignmentsMap[req.body.processName].trackPath) {
			log("Going to play: " + config.assignmentsMap[req.body.processName].trackPath);
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
					transitioningPlayer = createPlayer();
					transitioningPlayer.volume(0);
					transitioningPlayer.openFile(queuedAssignment.trackPath);
					var interval = setInterval(function () {
						if(intervalCounter >= config.crossFade.intervalLoops) {
							clearInterval(interval);
							manuallyStopped = true;
							player.stop();
							// Weird but this should make the mplayer process stop and exit
							player.sendCommands({
								quit: 0
							});

							player = transitioningPlayer;
							transitioningPlayer = null;
							// if(queuedAssignment) {
							// 	player.openFile(queuedAssignment.trackPath);
							// 	currentAssignment = queuedAssignment;
							// 	queuedAssignment = null;
							// }
						} else {
							intervalCounter = intervalCounter + 1;

							// update volume of current player
							var volume = (maxTime - (intervalCounter * config.crossFade.intervalTime))/maxTime;
							volume = crossFadeEasing(volume);
							player.volume(volume * 100);

							// update volume of transitioning player
							volume = (intervalCounter * config.crossFade.intervalTime)/maxTime;
							if(volume > 1.0) {
								volume = 1.0;
							}
							transitioningPlayer.volume(volume * 100);
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
var express = require('express');
var bodyParser = require('body-parser');
var MPlayer = require('mplayer');
var util = require('util');
var crossFadeEasing = require('eases/cubic-out');
var Config = require("./config.js");

var app = express(); 
var player = new MPlayer();
var config = Config.load();

app.use(bodyParser.json());

app.post('/process-changed', function (req, res) {
	var assignment = config.assignmentsMap[req.body.processName];
	if(assignment) {
		console.log("I will play: " + assignment.trackPath);
		if(!player.status.filename) {
			player.openFile(assignment.trackPath);
		} else {
			var intervalCounter = 0;
			var maxTime = config.crossFade.intervalTime * config.crossFade.intervalLoops;
			var interval = setInterval(function () {
				if(intervalCounter >= config.crossFade.intervalLoops) {
					clearInterval(interval);
					player.stop();
					player.openFile(assignment.trackPath);
				} else {
					intervalCounter = intervalCounter + 1;
					var volume = (maxTime - (intervalCounter * config.crossFade.intervalTime))/maxTime;
					volume = crossFadeEasing(volume);
					player.volume(volume * 100);
				}
			}, config.crossFade.intervalTime); 
		}
	} else {
		if(!config.passThroughsMap[req.body.processName]) {
			player.stop();
		}
	}

	res.send(JSON.stringify({success: true}));
});

app.get('/config-changed', function (req, res) {
	config = Config.load();
	res.send(JSON.stringify({success: true}));
});

app.listen(10733);
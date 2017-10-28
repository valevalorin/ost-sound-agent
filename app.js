var express = require('express');
var bodyParser = require('body-parser');
var MPlayer = require('mplayer');
var util = require('util');
var cubicOut = require('eases/cubic-out');

var app = express(); 
var player = new MPlayer();

app.use(bodyParser.json());

var config  = {
	crossFade: {
		seconds: 2,
		framerate: 60,
	}
}

config.crossFade.intervalTime = 1000/config.crossFade.framerate;
config.crossFade.intervalLoops = (1000 * config.crossFade.seconds)/config.crossFade.intervalTime;

app.post('/process-changed', function (req, res) {
	if(!player.status.filename) {
		player.openFile('song.mp3');
	} else {
		var intervalCounter = 0;
		var maxTime = config.crossFade.intervalTime * config.crossFade.intervalLoops;
		var interval = setInterval(function () {
			if(intervalCounter >= config.crossFade.intervalLoops) {
				clearInterval(interval);
				player.stop();
				player.openFile('song.mp3');
			} else {
				intervalCounter = intervalCounter + 1;
				var volume = (maxTime - (intervalCounter * config.crossFade.intervalTime))/maxTime;
				volume = cubicOut(volume);
				player.volume(volume * 100);
			}
		}, config.crossFade.intervalTime); 
	}

	res.send(JSON.stringify({success: true}));
});

app.listen(10733);
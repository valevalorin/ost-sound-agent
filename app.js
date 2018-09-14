const express = require('express');
const bodyParser = require('body-parser');
const Player = require('./player.js');
const Logger = require('./logger.js');

const app = express();
Player.init();

try {
	app.use(bodyParser.json());

	app.post('/process-changed', function (req, res) {
		Logger.log('Process Received - ' + req.body.processName);
		Player.queue(req.body.processName);
		res.send(JSON.stringify({success: true}));
	});

	app.get('/stop', function (req, res) {
		Player.stop();
		res.send(JSON.stringify({success: true}));
	});

	app.get('/config-changed', function (req, res) {
		Player.reloadConfig();
		res.send(JSON.stringify({success: true}));
	});

	app.listen(10733);
} catch (ex) {
	Logger.log(ex);
}
var fs = require('fs');

function load() {
	var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

	config.crossFade.intervalTime = 1000/config.crossFade.framerate;
	config.crossFade.intervalLoops = (1000 * config.crossFade.seconds)/config.crossFade.intervalTime;

	config.assignmentsMap = {};
	for (var i = config.assignments.length - 1; i >= 0; i--) {
		var assignment = config.assignments[i];
		assignment.trackPath = assignment.package.replace("package.ostmanifest", assignment.track).replace(/\\/g, "\\\\");
		config.assignmentsMap[assignment.processName] = assignment;
	}

	config.passThroughsMap = {};
	for (var i = config.passThroughs.length - 1; i >= 0; i--) {
		config.passThroughsMap[config.passThroughs[i]] = true;
	}

	return config;
}

module.exports.load = load;
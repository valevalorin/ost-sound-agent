var fs = require('fs');

function load() {
	var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

	config.crossFade.intervalTime = 1000/config.crossFade.framerate;
	config.crossFade.intervalLoops = (1000 * config.crossFade.seconds)/config.crossFade.intervalTime;

	config.assignmentsMap = {};
	if(config.assignments) {
		for (var i = config.assignments.length - 1; i >= 0; i--) {
			var assignment = config.assignments[i];
			if(nnue(assignment.fullPath)) {
				assignment.trackPath = assignment.trackPath;
			} else {
				assignment.trackPath = assignment.package.replace("package.ostmanifest", assignment.track).replace(/\\/g, "\\\\");
			}
			config.assignmentsMap[assignment.processName] = assignment;
		}
	}

	config.passThroughsMap = {};
	if(config.passThroughs) {
		for (var i = config.passThroughs.length - 1; i >= 0; i--) {
			config.passThroughsMap[config.passThroughs[i]] = true;
		}
	}

	return config;
}

function nnue(value) {
	if(value !== null && value !== undefined) {
		if(typeof value == 'string') {
			return value.length > 0;
		}
	}
	return false;
}

module.exports.load = load;
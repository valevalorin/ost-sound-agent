const fs = require('fs');

function load() {
	var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

	config.crossFade.intervalTime = 1000/config.crossFade.framerate;
	config.crossFade.intervalLoops = (1000 * config.crossFade.seconds)/config.crossFade.intervalTime;
	var trackHome = config.trackHome;
	if(trackHome.lastIndexOf('\\') != trackHome.length - 1) {
		trackHome = trackHome + '\\';
	}

	config.assignmentsMap = {};
	if(config.assignments) {
		for (var i = config.assignments.length - 1; i >= 0; i--) {
			var assignment = config.assignments[i];

			if(config.multiMode && assignment.tracks) {
				for(var j = 0; j < assignment.tracks.length; j++) {
					var track = assignment.tracks[j];
					var trackPath = track.track;
					trackPath = trackHome + trackPath;
					trackPath = trackPath.replace(/\\/g, "\\\\");
					assignment.tracks[j] = {
						track: trackPath,
						loopStart: nnue(track.loopStart) ? track.loopStart : null,
						loopEnd: nnue(track.loopEnd) ? track.loopEnd: null
					};
				}
			} else {
				if(nnue(assignment.fullPath)) {
					assignment.trackPath = assignment.fullPath;
					assignment.trackPath = trackPath.replace(/\\/g, "\\\\");
				} else if(assignment.track) {
					assignment.trackPath = trackHome + assignment.track;
					assignment.trackPath = assignment.trackPath.replace(/\\/g, "\\\\");
				}
			}

			config.assignmentsMap[assignment.processName] = assignment;
		}
	}

	config.nonPassThroughsMap = {};
	if(config.nonPassThroughs) {
		for (var i = config.nonPassThroughs.length - 1; i >= 0; i--) {
			config.nonPassThroughsMap[config.nonPassThroughs[i]] = true;
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
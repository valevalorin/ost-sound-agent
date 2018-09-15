// Imports
const fs = require('fs');
const MPlayer = require('mplayer');
const util = require('util');
const crossFadeEasing = require('eases/cubic-out');
const Config = require("./config.js");
const Logger = require('./logger.js');

// State

var config = Config.load();
var manuallyStopped = false;
var queuedAssignment = null;
var currentAssignment = null;
var transitionTimeout = null;
var logFile = null;
var player = null;
var transitioningPlayer = null;
var crossFading = false;
var queuedDuringCrossFade = null;

// Keeps track of whats been played for variety playback mode
var consumedMap = {};
for(var i = 0; i < config.assignments.length; i++) {
  var agn = config.assignments[i];
  consumedMap[agn.processName] = [];
}

// Methods

function init() {
  player = instantiateMPlayer();
  transitioningPlayer = instantiateMPlayer();
}

function instantiateMPlayer() {
  try {
    var p = new MPlayer({mplayerPath: 'mplayer.exe'});
    p.on('stop', playerStop);
    p.on('time', playerTime);

    return p;
  } catch (ex) {
    console.log("Failed to initialize player.");
  }
}

function playerStop(status) {
  if(!manuallyStopped) {
    if(config.multiMode && currentAssignment.tracks && !config.multiMode.loop) {
      var track = getNextTrack(currentAssignment);
      log(track);
      populateCurrentTrack(currentAssignment, track);
      player.openFile(currentAssignment.currentTrack.trackPath);
      consumeTrack(currentAssignment.processName, currentAssignment.currentTrack.trackPath);
    } else {
      player.openFile(currentAssignment.currentTrack.trackPath);
      if(currentAssignment.currentTrack.loopStart !== null && currentAssignment.currentTrack.loopStart !== undefined) {
        player.seek(currentAssignment.currentTrack.loopStart);
      }
    }
  }
  manuallyStopped = false;
}

function playerTime(currentTimeValue) {
  if(!config.multiMode || (config.multiMode && config.multiMode.loop)) {
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
  }
}

function queue(processName) {
  if(crossFading) {
    queuedDuringCrossFade = processName;
  }

  if(currentAssignment === null) {
    // Nothing is currently playing so just fire away
    var assignment = config.assignmentsMap[processName];
    if(assignment) {
      currentAssignment = assignment;
      var track = getNextTrack(currentAssignment);
      populateCurrentTrack(currentAssignment, track);
      player.openFile(currentAssignment.currentTrack.trackPath);
      consumeTrack(processName, currentAssignment.currentTrack.trackPath);
    }
  } else {
    // Something is currently playing, determine if track is queueable

    if(isCurrentlyPlaying(processName)) {
      // If there's a queued item that hasn't swapped over due to transition buffer, then clear it
      if(queuedAssignment !== null) {
        clearQueuedAssignment();
      }
    } else if (queuedAssignment !== null) {
      // If a process is already queued and we receive a different process then change the queued assignment
      if(isQueued(processName)) {
        clearQueuedAssignment();
        transition(processName);
      }
    } else {
      // Queued assignment is null, queue it up
      transition(processName);
    }
  }
}

function stop() {
  manuallyStopped = true;
  player.stop();
}

function transition(processName) {
  if(transitionTimeout !== null) {
    clearTimeout(transitionTimeout);
  }

  queuedAssignment = config.assignmentsMap[processName];
  populateCurrentTrack(queuedAssignment, getNextTrack(queuedAssignment));
  Logger.log(queuedAssignment);
  var isPassThrough = queuedAssignment === null && !config.nonPassThroughsMap[processName];

  // If the process is a passthrough, leave the current player alone other start crossfading between players
  if(!isPassThrough)  {
    // Give the user a chance to change windows before actually initiating a change of tracks
    transitionTimeout = setTimeout(function () {
      crossFade();
    }, config.transitionBuffer * 1000);  
  }
  
}

function clearQueuedAssignment() {
  queuedAssignment = null;
  if(transitionTimeout !== null) {
    clearTimeout(transitionTimeout);
    transitionTimeout = null;
  }
}

function crossFade() {
  crossFading = true;
  if(queuedAssignment) {
    // There's a track to transition to so let's start playing it in the transitioning player
    transitioningPlayer.volume(0);
    transitioningPlayer.openFile(queuedAssignment.currentTrack.trackPath);
  }
  var intervalCounter = 0;
  var maxTime = config.crossFade.intervalTime * config.crossFade.intervalLoops;
  // This interval updates the volume of the current player and the transitioning player (every config.crossFade.intervalTime) to create the cross fade effect
  var interval = setInterval(function () {
    if(intervalCounter < config.crossFade.intervalLoops) {
      // Still crossfading
      intervalCounter = intervalCounter + 1;

      // Update volume of current player
      var volume = (maxTime - (intervalCounter * config.crossFade.intervalTime))/maxTime;
      volume = crossFadeEasing(volume);
      player.volume(volume * 100);

      // Update volume of transitioning player
      if(queuedAssignment) {
        // Gradually increase volume to 100 from a minimum value
        var mod = intervalCounter - 10;
        if(mod < 0) {
          mod = 0;
        }
        var min = intervalCounter * config.crossFade.intervalTime;
        volume = ((mod * config.crossFade.intervalTime ) + min)/maxTime;
        if(volume > 1.0) {
          volume = 1.0;
        }
        transitioningPlayer.volume(volume * 100);
      }
    } else {
      clearInterval(interval);
      crossFadeComplete();
    }
  }, config.crossFade.intervalTime); 
}

function crossFadeComplete() {
  manuallyStopped = true;
  player.stop();

  if(queuedAssignment) {
    // There's actually a song to transition to so swap state around
    var buffer = player;
    player = transitioningPlayer;
    transitioningPlayer = buffer;

    consumeTrack(queuedAssignment.processName, queuedAssignment.currentTrack.trackPath);
    currentAssignment = queuedAssignment;
  } else {
    // We were given a non pass through so clear the state to be ready for the next process change
    currentAssignment = null;
    player.volume(100);
  }

  clearQueuedAssignment();
  crossFading = false;

  // It's possible we received some requests while cross fading, if so try to queue only the most recent one
  if(queuedDuringCrossFade !== null) {
    queue(queuedDuringCrossFade);
    queuedDuringCrossFade = null;
  }
}

function isCurrentlyPlaying(processName) {
  return currentAssignment && currentAssignment.processName === processName;
}

function isQueued(processName) {
  return queuedAssignment && queuedAssignment.processName === processName;
}

function getNextTrack(assignment) {
  if(!config.multiMode) {
    // no multimode, return only track
    return assignment.track;
  } else if(config.multiMode && assignment.tracks) {
    // is multimode, figure out what track to play next
    if(config.multiMode.shuffle === 'random') {
      return assignment.tracks[randomInt(assignment.tracks.length)];
    } else if (config.multiMode.shuffle === 'variety') {
      return getRandomNonConsumedTrack(assignment.processName, assignment.tracks);
    } else {
      return getSequentialTrack(assignment.processName, assignment.tracks);
    }
  }
}

function consumeTrack(processName, trackPath) {
  consumedMap[processName].push(trackPath);
}

function populateCurrentTrack(assignment, track) {
  assignment.currentTrack = {};
  assignment.currentTrack.trackPath = track.track;
  if(track.loopStart) {
    assignment.loopStart = loopStart;
  }
  if(track.loopEnd) {
    assignment.loopEnd = loopEnd;
  }
}

function getRandomNonConsumedTrack(processName, list) {
  var consumed = consumedMap[processName];
  var max = list.length - consumed.length;
  if(max == 0) {
    consumedMap[processName] = [];
    return list[randomInt(list.length)];
  }
  var target = randomInt(max);
  var cursor = 0;
  for(var i = 0; i < list.length; i++) {
    if(!consumed.includes(list[i].track)) {
      if(cursor == target) {
        return list[i];
      } else {
        cursor++;
      }
    }
  }
}

function getSequentialTrack(processName, list) {
  var consumed = consumedMap[processName];
  var max = list.length - consumed.length;
  if(max == 0) {
    consumedMap[processName] = [];
    return list[0];
  }
  
  return list[consumed.length];
}

function randomInt(max) {
  return Math.floor(Math.random()*max);
}

function reloadConfig() {
  config = Config.load();
}

module.exports = {
  init: init,
  queue: queue,
  stop: stop,
  reloadConfig: reloadConfig
}
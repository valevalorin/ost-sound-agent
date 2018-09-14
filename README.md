## Overview
This component serves as the audio backend for the OSt project. It's responsibilities listening to process state changes and controlling the mplayer instances that actually play your tracks.

## Development 
### Tools
1. Node (not sure about minimum version but I'm using v9.11.1)
2. `mplayer.exe` command line executable that functions on your OS (must be positioned at the top level of the project or in PATH)

### Getting Started
1. Clone project and navigate within
1. `npm install`
1. `npm start`

Instance should be running on port 10733 and accepting HTTP requests.

### Configuration
`config.json` (placed in the top level directory) is where all configuration of the service lives.

For a list of configuration properties and what they do please look at `config-schema.json`.

### API
* POST `/process-changed`
	* Description
		* Primary endpoint. Used to tell the player which process is currently active and therefore which track to play.
	* Body
		* ```{ "processName": "<name of process (without extension) that is now currently active>" }```

* GET `/config-changed`
	* Description
		* Used to reload `config.json` after changes have been made.
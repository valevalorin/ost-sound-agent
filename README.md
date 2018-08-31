## Controlling MPlayer
When you have an instance of the mplayer (created using `new MPlayer(...)`), it starts mplayer in 'slave mode'. In my fork of the library there's a 
command `sendCommands` for sending arbitrary documented commands to the slave instance.
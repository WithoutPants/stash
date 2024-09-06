# stash-stream-server

stash-stream-server is a server that performs the live transcoding functions remotely from the stash server. It is a standalone server that can be run on a separate machine from the stash server. It is designed to be run on a machine with a more powerful CPU and GPU than the stash server to perform the transcoding functions.

## Installation

stash-stream-server is a standalone binary that can be installed anywhere. Our recommendation is to install and run it in its own directory. 

Upon initial startup, stash-stream-server will prompt to create a configuration file. This configuration file will be saved in the current working directory. 

## Technical Details

stash-stream-server provides an HTTP API for the stash server to send transcoding requests to. The server will respond to requests ending in `/stream.*`, where `*` is any supported stream type extension. The server will use `ffmpeg` to transcode the stream and return the transcoded stream to the stash server.

When the stash UI is configured with the stash-stream-server URL, the stash UI will send the stream request to the stash-stream-server instead of the stash server. The request includes the server URL and the API key. stash-stream-server uses these to connect to the stash server and transcodes using the direct file stream from the stash server.

## Requirements

- if no `config.yml` file is in the current working directory, prompts the user to input a configuration file location, with the default being `$PWD/config.yml`
- if the entered configuration file location exists, then the server parses and reads the configuration file
- if the entered configuration file fails to parse, the server will exit with an error message
- if the entered configuration file does not exist, the server will create a new configuration file at the specified location and,
  - prompts the user to input the main configuration details: `host` and `port` to listen on, `ffmpeg_path` and `ffprobe_path`, and `log_file`
  - once these are entered, the configuration file is saved to the specified location and the server starts
- once the configuration file is read or initialised, the server starts and listens on the specified `host` and `port`

## Stretch goals:
- system tray icon like stash server
- possibly: perform other generate tasks like preview generation
- possibly not: phash generation - we'd need to ensure that server version is up to date
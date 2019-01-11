'use strict';

var WebSocketServer = require('ws').Server
  , qtmrt           = require('../index')
//   , SocketApi       = require('../../socket-api/dist/socket-api-node')
  , wss             = new WebSocketServer({ port: 3010 })
  , qtmHost         = process.argv[2] ? process.argv[2] : 'localhost'
  , qtmPort         = process.argv[3] ? process.argv[3] : 22223
;

function lowerCaseFirst(str) { return str.charAt(0).toLowerCase() + str.substring(1); }
function upperCaseFirst(str) { return str.charAt(0).toUpperCase() + str.substring(1); }

// class Server extends SocketApi {
class Server {
	constructor() {

		this.api = new qtmrt.Api({ debug: true, byteOrder: qtmrt.LITTLE_ENDIAN });
		this.parameters = null;

		var messageHandlers = {};

		var onMessage = function(msg) {
			var errorMsg = null;
			msg = JSON.parse(msg);

			if (msg.endpoint) {
				var endpoint    = msg.endpoint.split('/')
				  , handlerName = lowerCaseFirst(endpoint[0]) + 'Handler'
				  , params      = msg.params
				  , handler     = messageHandlers[handlerName]
				;

				var method = (['data', 'event', 'status', 'invoke'].indexOf(msg.type) > 0)
					? '_on' + upperCaseFirst(endpoint[1])
					: '_on' + upperCaseFirst(msg.type) + upperCaseFirst(endpoint[1]);

				params.unshift(msg);

				if (handler) {
					if (handler[method]) {
						handler[method].apply(messageHandlers[handlerName], params);
					}
					else {
						errorMsg = 'Unknown method \'' + method + '\'.';
					}
				}
				else {
					errorMsg = 'No handler found for endpoint \'' + msg.endpoint + '\'.';
				}
			}
			else {
				console.log('Warning: Message has no endpoint attribute.');
			}

			if (errorMsg !== null) {
				console.log(errorMsg);

				this.send(JSON.stringify({
					type: 'status',
					endpoint: 'status/' + msg.endpoint.split('/')[1],
					data: {
						code: 404,
						message: errorMsg
					}
				}));
			}
		};

		this.api.on('end', function(data) {
			// The end event is emitted when streaming has stopped and no more frames are being sent.
		});

		this.api.on('event', function(event) {
			console.log(event.name.yellow);
		});

		this.api.on('disconnect', function(event) {
			process.exit();
		});

		this.api.connect(qtmPort, qtmHost)
			.then(() => {
				return this.api.getParameters('General', '3D', '6D', 'Analog', 'Force', 'Image', 'GazeVector', 'Skeleton');
			})
			.then((parameters) => {
				this.parameters = parameters;

				return this.api.qtmVersion();
			})
			.then((version) => {
				wss.on('connection', (ws) => {
					this.api.logger.log('Client connected.', 'yellow');

					messageHandlers.frameHandler = new FrameMessageHandler(ws, this.api);
					messageHandlers.qtmHandler = new QtmMessageHandler(ws, this.api);

					ws.send(JSON.stringify({
						type: 'data',
						endpoint: 'qtm/parameters',
						data: this.parameters
					}));

					ws.send(JSON.stringify({
						type: 'data',
						endpoint: 'qtm/version',
						data: version
					}));

					ws.on('message', onMessage);

					ws.on('close', (code, message) => {
						if (this.api.isStreaming) {
							this.api.logger.log('Client disconnected, stop streaming.', 'yellow');
							this.api.stopStreaming();
						}
					});
				});
			})
		;
	}

}

var server = new Server();

class FrameMessageHandler {
	constructor(ws, api) {
		this.ws = ws;
		this.api = api;
	}

	_onGetCurrentFrame(msg) {
		var args = [].slice.call(arguments);

		this.api.getCurrentFrame.apply(this.api, args.slice(1))
			.then((frame) => {
				this.ws.send(JSON.stringify({
					type: 'data',
					endpoint: 'frame/currentFrame',
					data: frame
				}));
			})
			.catch((err) => {
				this.ws.send(JSON.stringify({
					type: 'status',
					endpoint: 'frame/currentFrame',
					data: {
						code: 404,
						message: err
					}
				}), error => {
					// console.log(error);
				});
			})
		;
	}

	_onStreamFrames(msg, options) {
		this.api.on('frame', (frameData) =>{
			console.log('Received frame:'.green);

			this.ws.send(JSON.stringify({
				type: 'data',
				endpoint: 'frame/frame',
				data: frameData
			}), error => {
				if (error) {
					// console.log(error);
				}
			});
		});

		this.api.streamFrames(options);
	}

	_onStopStreaming(msg) {
		this.api.stopStreaming()
			.then((response) => {
				this.ws.send(JSON.stringify({
					type: 'status',
					endpoint: 'frame/stopStreaming',
					data: {
						code: 200,
						message: 'Stopped streaming'
					}
				}));
			})
			.catch((err) => {
				this.ws.send(JSON.stringify({
					type: 'status',
					endpoint: 'frame/stopStreaming',
					data: {
						code: 500,
						message: err.toString()
					}
				}));
			})
		;
	}
}

class QtmMessageHandler {
	constructor(ws, api) {
		this.ws = ws;
		this.api = api;
	}

	_onGetParameters(msg) {
		var args = [].slice.call(arguments);

		this.api.getParameters.apply(this.api, args.slice(1))
			.then((parameters) => {
				this.ws.send(JSON.stringify({
					type: 'data',
					endpoint: 'qtm/parameters',
					data: parameters
				}));
			})
		;
	}

	_onSetParameters(msg, params) {
		var args = [].slice.call(arguments);

		this.api.setParameters(params)
			.then((response) => {
				this.ws.send(JSON.stringify({
					type: 'status',
					endpoint: 'qtm/parameters',
					data: {
						code: 200,
						message: response
					}
				}));
			})
			.catch((err) => {
				this.ws.send(JSON.stringify({
					type: 'status',
					endpoint: 'qtm/parameters',
					data: {
						code: 500,
						message: err
					}
				}));
			})
		;
	}

	_onTakeControl(msg, password) {
		this.api.takeControl(password)
			.then((response) => {
				this.ws.send(JSON.stringify({
					type: 'status',
					endpoint: 'qtm/takeControl',
					data: {
						code: 200,
						message: response
					}
				}));
			})
			.catch((err) => {
				this.ws.send(JSON.stringify({
					type: 'status',
					endpoint: 'qtm/takeControl',
					data: {
						code: 401,
						message: err
					}
				}));
			})
		;
	}

	_onReleaseControl(msg) {
		this.api.releaseControl()
			.then((response) => {
				this.ws.send(JSON.stringify({
					type: 'status',
					endpoint: 'qtm/releaseControl',
					data: {
						code: 200,
						message: response
					}
				}));
			})
			.catch((err) => {
				this.ws.send(JSON.stringify({
					type: 'status',
					endpoint: 'qtm/releaseControl',
					data: {
						code: 500,
						message: err
					}
				}));
			})
		;
	}

	_onNewMeasurement(msg) {
		this.api.newMeasurement()
			.then((response) => {
				this.ws.send(JSON.stringify({
					type: 'status',
					endpoint: 'qtm/newMeasurement',
					data: {
						code: 200,
						message: response
					}
				}));
			})
			.catch((err) => {
				this.ws.send(JSON.stringify({
					type: 'status',
					endpoint: 'qtm/newMeasurement',
					data: {
						code: 500,
						message: err
					}
				}));
			})
		;
	}

	_onCloseMeasurement(msg) {
		this.api.closeMeasurement()
			.then((response) => {
				this.ws.send(JSON.stringify({
					type: 'status',
					endpoint: 'qtm/closeMeasurement',
					data: {
						code: 200,
						message: response
					}
				}));
			})
			.catch((err) => {
				this.ws.send(JSON.stringify({
					type: 'status',
					endpoint: 'qtm/closeMeasurement',
					data: {
						code: 500,
						message: err
					}
				}));
			})
		;
	}

	_onStartCapture(msg) {
		this.api.startCapture()
			.then((response) => {
				this.ws.send(JSON.stringify({
					type: 'status',
					endpoint: 'qtm/startCapture',
					data: {
						code: 200,
						message: response
					}
				}));
			})
			.catch((err) => {
				this.ws.send(JSON.stringify({
					type: 'status',
					endpoint: 'qtm/startCapture',
					data: {
						code: 500,
						message: err
					}
				}));
			})
		;
	}

	_onStopCapture(msg) {
		this.api.stopCapture()
			.then((response) => {
				this.ws.send(JSON.stringify({
					type: 'status',
					endpoint: 'qtm/stopCapture',
					data: {
						code: 200,
						message: response
					}
				}));
			})
			.catch((err) => {
				this.ws.send(JSON.stringify({
					type: 'status',
					endpoint: 'qtm/stopCapture',
					data: {
						code: 500,
						message: err
					}
				}));
			})
		;
	}

	_onLoadFile(msg, file) {
		this.api.load(file)
			.then((response) => {
				this.ws.send(JSON.stringify({
					type: 'status',
					endpoint: 'qtm/loadFile',
					data: {
						code: 200,
						message: response
					}
				}));
			})
			.catch((err) => {
				this.ws.send(JSON.stringify({
					type: 'status',
					endpoint: 'qtm/loadFile',
					data: {
						code: 500,
						message: err.toString()
					}
				}));
			})
		;
	}

	_onSaveFile(msg, file, overwrite) {
		this.api.save(file)
			.then((response) => {
				this.ws.send(JSON.stringify({
					type: 'status',
					endpoint: 'qtm/saveFile',
					data: {
						code: 200,
						message: response
					}
				}));
			})
			.catch((err) => {
				this.ws.send(JSON.stringify({
					type: 'status',
					endpoint: 'qtm/saveFile',
					data: {
						code: 500,
						message: err.toString()
					}
				}));
			})
		;
	}

	_onLoadProject(msg, projectPath) {
		this.api.loadProject(projectPath)
			.then((response) => {
				this.ws.send(JSON.stringify({
					type: 'status',
					endpoint: 'qtm/loadProject',
					data: {
						code: 200,
						message: response
					}
				}));
			})
			.catch((err) => {
				this.ws.send(JSON.stringify({
					type: 'status',
					endpoint: 'qtm/loadProject',
					data: {
						code: 500,
						message: err.toString()
					}
				}));
			})
		;
	}

	_onGetState(msg) {
		this.api.getState()
			.then((response) => {
				this.ws.send(JSON.stringify({
					type: 'data',
					endpoint: 'qtm/getState',
					data: response
				}));
			})
			.catch((err) => {
				this.ws.send(JSON.stringify({
					type: 'status',
					endpoint: 'qtm/getState',
					data: {
						code: 500,
						message: err.toString()
					}
				}));
			})
		;
	}
}

// Handle graceful shutdown {{{
if (process.platform === 'win32') {
	var rl = require('readline').createInterface({
		input: process.stdin,
		output: process.stdout
	});

	rl.on('SIGINT', () => {
		process.emit('SIGINT');
	});
}

process.on('SIGINT', () => {
	process.exit();
});
// }}} End Handle graceful shutdown
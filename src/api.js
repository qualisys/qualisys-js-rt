'use strict';

(function() {
	var dgram        = require('dgram')
	  , Q            = require('q')
	  , _            = require('lodash')
	  , events       = require('events')
	  , qtmrt        = require('./qtmrt')
	  , writeUInt32  = require('./buffer-io').writeUInt32
	  , Mangler      = require('./mangler')
	  , Packet       = require('./packet')
	  , Command      = require('./command')
	  , Logger       = require('./logger')
	  , EventEmitter = require('events')
	;

	_.str = require('underscore.string');

	class Api extends EventEmitter {
		constructor(options) {
			super();

			this.net               = require('net');
			this.client            = null;
			this.response          = null;
			this.deferredResponse  = null;
			this.promiseQueue      = [];
			this.issuedCommands    = [];
			this.logger            = new Logger();
			this.mangler           = new Mangler();
			this.currentPacketSize = false;
			this._isConnected      = false;
			this._isStreaming      = false;

			if (arguments.length < 1)
				options = {};

			this.options = _.defaults(options, {
				debug: false,
				frequency: 100,
				discoverPort: 22226,
				discoverTimeout: 2000,
				byteOrder: qtmrt.LITTLE_ENDIAN,
			});

			this.frequency(this.options.frequency);
		}

		get isConnected() { return this._isConnected; }
		get isStreaming() { return this._isStreaming; }

		bootstrap() {
			// Disable Nagle's algorithm.
			this.client.setNoDelay(true);

			// Set byte order on commands.
			Command._byteOrder = this.options.byteOrder;

			this.client.on('data', function(chunk) {
				this.mangler.read(chunk, this.options.byteOrder, { fun: this.receivePacket, thisArg: this });
			}.bind(this));

			this.client.on('end', function() {
				this.logger.log('Disconnected', 'white', 'bold');
				this.emit('disconnect');
			}.bind(this));
		}

		setupUdp(port) {
			var s = dgram.createSocket('udp4');

			s.on('message', function(chunk) {
				this.mangler.read(chunk, this.options.byteOrder, { fun: this.receivePacket, thisArg: this });
			}.bind(this));

			s.bind(port, this.host, function() { });
		}

		log(msg, color, style) {
			this.logger.logPacket(msg, color, style);
		}

		receivePacket(data) {
			var packet  = Packet.create(data, this.options.byteOrder)
			  , command = this.issuedCommands.pop()
			;

			if (packet.type === qtmrt.COMMAND)
				packet.type = qtmrt.COMMAND_RESPONSE;

			if (this.options.debug)
				this.logger.logPacket(packet);

			if (packet.type === qtmrt.EVENT) {
				if (command.data === 'GetState')
					this.promiseQueue.pop().resolve({ id: packet.eventId, name: packet.eventName });

				this.emit('event', packet.toJson());
			}
			else if (packet.type === qtmrt.XML) {
				this.promiseQueue.pop().resolve(packet.toJson());
			}
			else if (packet.type === qtmrt.C3D_FILE) {
				// Implement.
			}
			else if (packet.type === qtmrt.COMMAND_RESPONSE) {
				if (_.str.startsWith(command.data, 'ByteOrder')) {
					this.promiseQueue.pop().resolve(/little endian/.test(packet.data) ? 'little endian' : 'big endian');
				}
				else if (_.str.startsWith(command.data, 'QTMVersion')) {
					var human   = 'QTM ' + packet.data.replace('QTM Version is ', '').slice(0, -1)
					  , version = human.match(/QTM (\d+)\.(\d+)(?: (?:Beta)|(?:Alpha))? \(build (\d+)\)/)
					;
					this.promiseQueue.pop().resolve({ major: version[1], minor: version[2], build: version[3], human: human });
				}
				else {
					this.promiseQueue.pop().resolve(packet.data);
				}
			}
			else if (command && _.str.startsWith(command.data, 'GetCurrentFrame')) {
				this.promiseQueue.pop().resolve(packet.toJson());
			}
			else if (packet.type !== qtmrt.DATA) {
				if (packet.type === qtmrt.NO_MORE_DATA) {
					this.emit('end');
				}
				else {
					this.promiseQueue.pop().resolve(packet);
				}
			}
			else if (packet.type === qtmrt.DATA) {
				this.emit('frame', packet.toJson());
			}
			else if (packet.type === qtmrt.ERROR) {
				this.promiseQueue.pop().reject(packet.data);
			}
		}

		connect(port, host, major, minor) {
			if (this.client !== null)
				return Q.reject();

			if (arguments.length < 1)
				port = 22223;

			if (arguments.length < 2)
				host = 'localhost';

			if (arguments.length < 3) {
				major = 1;
				minor = 13;
			}
			else {
				if (!_.isNumber(major))
					throw new TypeError('Major version must be a number');

				if (!_.isNumber(major))
					throw new TypeError('Minor version must be a number');
			}

			this.host = host;
			this.port = port;

			var deferredCommand  = Q.defer();

			if (this.options.debug)
				this.logger.log('Connecting to ' + host + ':' + port + ' (byte order: '
					+ this.options.byteOrder + ')', 'white', 'bold');

			this.client = this.net.connect(port, host, function() { });
			this.issuedCommands.unshift('Connect');
			this.bootstrap();

			this.promiseResponse()
				.then((result) => {
					if (result === 'QTM RT Interface connected\0') {
						this._isConnected = true;

						this.send(Command.version(major, minor))
							.then(function(data) {
								deferredCommand.resolve();
							})
							.catch(function(err) {
								deferredCommand.reject(new Error(err));
							})
						;
					}
					else {
						deferredCommand.reject(new Error(result));
					}
				})
				.catch(function(err) {
					console.log(err);
				});

			return deferredCommand.promise;
		}

		qtmVersion() { return this.send(Command.qtmVersion()); }
		byteOrder() { return this.send(Command.byteOrder()); }
		getState() { return this.send(Command.getState()); }
		getParameters() { return this.send(Command.getParameters.apply(Command, arguments)); }
		setParameters() { return this.send(Command.setParameters.apply(Command, arguments)); }
		getCurrentFrame() { return this.send(Command.getCurrentFrame.apply(Command, arguments)); }
		releaseControl() { return this.send(Command.releaseControl()); }
		newMeasurement() { return this.send(Command.newMeasurement()); }
		closeMeasurement() { return this.send(Command.closeMeasurement()); }
		startCapture() { return this.send(Command.startCapture()); }
		stopCapture() { return this.send(Command.stopCapture()); }
		trigger() { return this.send(Command.trig()); }

		// XXX: Not tested with C3D file reply.
		getCaptureC3D() { return this.send(Command.getCaptureC3D()); }
		// XXX: Not tested with QTM file reply.
		getCaptureQtm() { return this.send(Command.getCaptureQtm()); }

		streamFrames(options) {
			if (this._isStreaming)
				return Q.reject('Could not start streaming, already streaming');

			this._isStreaming = true;

			if (_.isUndefined(options.frequency))
				options.frequency = this.options.frequency;

			if (!_.isUndefined(options.udpPort) && (_.isUndefined(options.udpAddress)
					||  options.updAddress === 'localhost' ||  options.udpAddress === '127.0.0.1'))
				setupUdp.call(this, options.udpPort);

			return this.send(Command.streamFrames.apply(Command, [options]));
		}

		stopStreaming() {
			if (!this._isStreaming) {
				this.logger.log('Cannot stop streaming, not currently streaming', 'red');
				return;
			}

			this._isStreaming = false;
			this.emit('end');

			return this.send(Command.stopStreaming());
		}

		takeControl(pass) {
			if (!_.isUndefined(pass) && !_.isString(pass))
				throw new TypeError('Password must be a string');

			return this.send(Command.takeControl(pass));
		}

		load(filename) {
			if (arguments.length < 1)
				throw new TypeError('No filename specified');

			if (!_.isString(filename))
				throw new TypeError('Filename must be a string');

			return this.send(Command.load(filename));
		}

		save(filename, overwrite) {
			if (arguments.length < 1)
				throw new TypeError('No filename specified');

			if (!_.isString(filename))
				throw new TypeError('Filename must be a string');

			if (arguments.length > 1)
				overwrite = 'overwrite';

			return this.send(Command.save(filename, overwrite));
		}

		loadProject(projectPath) {
			if (arguments.length < 1)
				throw new TypeError('No project path specified');

			if (!_.isString(projectPath))
				throw new TypeError('Project path must be a string');

			return this.send(Command.loadProject(projectPath));
		}

		setQtmEvent(label) {
			if (arguments.length < 1)
				throw new TypeError('No label specified');

			if (!_.isString(label))
				throw new TypeError('Label must be a string');

			return this.send(Command.setQtmEvent(label));
		}

		send(commandPacket) {
			if (this.client === null)
				new Error('Not connected to QTM. Connect and try again.');

			// Don't expect a reply on the StreamFrames command.
			var promise = (_.str.startsWith(commandPacket.data, 'StreamFrames'))
				? Q.resolve()
				: this.promiseResponse();

			commandPacket.isResponse = false;
			this.issuedCommands.unshift(commandPacket);

			this.client.write(commandPacket.buffer, 'utf8', function(data) {
				if (this.options.debug)
					this.logger.logPacket(commandPacket);
			}.bind(this));

			return promise;
		}

		promiseResponse() {
			var deferredResponse = Q.defer();

			this.promiseQueue.unshift(deferredResponse);

			return deferredResponse.promise;
		}

		disconnect() {
			if (this.client === null)
				new Error('Not connected to QTM. Connect and try again.');

			this.client.end();

			this.isConnected = false;
		}

		discover(port) {
			if (_.isUndefined(port))
				port = this.options.discoverPort;

			var server = dgram.createSocket('udp4')
			  , receivePort = port + 1
			  , discoveredServers = []
			  , deferred = Q.defer()
			;

			server.on('error', function(err) {
				console.log('Server error:\n' + err.stack);
				server.close();
			});

			server.on('message', (msg, rinfo) => {
				// Set type to discover type.
				writeUInt32(msg, 7, 4);

				var discoverPacket = Packet.create(msg, this.options.byteOrder, rinfo.address, rinfo.port);

				if (this.options.debug)
					this.logger.logPacket(discoverPacket);

				discoveredServers.push({
					serverInfo: discoverPacket.serverInfo,
					serverBasePort: discoverPacket.serverBasePort,
					srcAddress: discoverPacket.srcAddress,
					srcPort: discoverPacket.srcPort,
				});
			});

			server.bind(receivePort);

			// Create discover packet.
			var buf = new Buffer(10);
			buf.writeUInt32LE(10, 0);
			buf.writeUInt32LE(7, 4);
			buf.writeUInt16BE(receivePort, 8);

			var client = dgram.createSocket('udp4')
				// , address = 'ff02::1'
			  , address = '255.255.255.255'
			;

			client.bind();
			client.on('listening', () => {
				client.setBroadcast(true);
				client.send(buf, 0, buf.length, port, address, function(err, bytes) {
					client.close();
				});

				if (this.options.debug)
					this.logger.logPacket(Packet.create(buf, this.options.byteOrder));

				setTimeout(function() {
					server.close();
					server.unref();
					deferred.resolve(discoveredServers);
				}, this.options.discoverTimeout);

			}.bind(this));

			return deferred.promise;
		}

		frequency(freq) {
			if (isNaN(freq) && freq !== 'AllFrames')
				throw new TypeError('Frequency must be a number or \'AllFrames\'');

			this.options.frequency = freq;
		}

		debug(val) {
			this.options.debug = val ? true : false;
		}
	}

	module.exports = Api;
})();
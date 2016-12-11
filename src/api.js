'use strict';

(function() {
	var dgram       = require('dgram')
	  , Q           = require('q')
	  , _           = require('underscore')
	  , events      = require('events')
	  , qtmrt       = require('./qtmrt')
	  , writeUInt32 = require('./helpers').writeUInt32
	  , mixin       = require('./helpers').mixin
	  , Mangler     = require('./mangler')
	  , Packet      = require('./packet')
	  , Command     = require('./command')
	  , Logger      = require('./logger')
	;

	_.str = require('underscore.string');

	class Api {
		constructor(options) {
			this.net               = require('net');
			this.client            = null;
			this.response          = null;
			this.deferredResponse  = null;
			this.promiseQueue      = [];
			this.issuedCommands    = [];
			this.logger            = new Logger();
			this.mangler           = new Mangler();
			this.isStreaming       = false;
			this.currentPacketSize = false;

			events.EventEmitter.call(this);

			if (arguments.length < 1)
				options = {};

			this.options = _.defaults(options, {
				debug: false,
				frequency: 100,
				discoverPort: 22226,
				discoverTimeout: 2000,
			});

			this.frequency(this.options.frequency);
		}

		bootstrap() {
			// Disable Nagle's algorithm.
			this.client.setNoDelay(true);

			this.client.on('data', function(chunk) {
				this.mangler.read(chunk, { fun: this.receivePacket, thisArg: this });
			}.bind(this));

			this.client.on('end', function() {
				this.logger.log('Disconnected', 'white', 'bold');
				this.emit('disconnect');
			}.bind(this));
		}

		setupUdp(port) {
			var s = dgram.createSocket('udp4');

			s.on('message', function(chunk) {
				this.mangler.read(chunk, { fun: this.receivePacket, thisArg: this });
			}.bind(this));

			s.bind(port, this.host, function() { });
		}

		log(msg, color, style) {
			this.logger.logPacket(msg, color, style);
		}

		receivePacket(data) {
			var packet  = Packet.create(data)
			  , command = this.issuedCommands.pop()
			;

			if (qtmrt.COMMAND === packet.type)
				packet.type = qtmrt.COMMAND_RESPONSE;

			if (this.options.debug)
				this.logger.logPacket(packet);

			if (qtmrt.EVENT === packet.type) {
				if (command.data === 'GetState')
					this.promiseQueue.pop().resolve({ id: packet.eventId, name: packet.eventName });

				this.emit('event', packet.toJson());
			}
			else if (qtmrt.XML === packet.type) {
				this.promiseQueue.pop().resolve(packet.toJson());
			}
			else if (qtmrt.C3D_FILE === packet.type) {
				// Implement.
			}
			else if (qtmrt.COMMAND_RESPONSE === packet.type) {
				if (_.str.startsWith(command.data, 'ByteOrder'))
					this.promiseQueue.pop().resolve(/little endian/.test(packet.data) ? 'little endian' : 'big endian');

				else if (_.str.startsWith(command.data, 'QTMVersion')) {
					var human   = 'QTM ' + packet.data.replace('QTM Version is ', '').slice(0, -1)
					  , version = human.match(/QTM (\d+)\.(\d+)(?: (?:Beta)|(?:Alpha))? \(build (\d+)\)/)
					;
					this.promiseQueue.pop().resolve({ major: version[1], minor: version[2], build: version[3], human: human });
				}

				else
					this.promiseQueue.pop().resolve(packet);
			}
			else if (command && _.str.startsWith(command.data, 'GetCurrentFrame')) {
				this.promiseQueue.pop().resolve(packet.toJson());
			}
			else if (qtmrt.DATA !== packet.type) {
				if (qtmrt.NO_MORE_DATA === packet.type) {
					this.emit('end');
				}
				else
					this.promiseQueue.pop().resolve(packet);
			}
			else if (qtmrt.DATA === packet.type) {
				this.emit('frame', packet.toJson());
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
				this.logger.log('Connecting to ' + host + ':' + port, 'white', 'bold');

			this.client = this.net.connect(port, host, function() { });
			this.issuedCommands.unshift('Connect');
			this.bootstrap();

			this.promiseResponse()
				.then((packet) => {
					if (packet.data.toString() === 'QTM RT Interface connected\0') {
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
						deferredCommand.reject(new Error(packet.data.toString()));
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
		close() { return this.send(Command.close()); }
		start() { return this.send(Command.start()); }
		stop() { return this.send(Command.stop()); }
		trig() { return this.send(Command.trig()); }

		// XXX: Not tested with C3D file reply.
		getCaptureC3D() { return this.send(Command.getCaptureC3D()); }
		// XXX: Not tested with QTM file reply.
		getCaptureQtm() { return this.send(Command.getCaptureQtm()); }

		streamFrames(options) {
			if (this.isStreaming)
				return Q.reject('Could not start streaming, already streaming');

			this.isStreaming = true;

			if (_.isUndefined(options.frequency))
				options.frequency = this.options.frequency;

			if (!_.isUndefined(options.udpPort) && (_.isUndefined(options.udpAddress)
					||  options.updAddress === 'localhost' ||  options.udpAddress === '127.0.0.1'))
				setupUdp.call(this, options.udpPort);

			return this.send(Command.streamFrames.apply(Command, [options]));
		}

		stopStreaming() {
			if (!this.isStreaming) {
				this.logger.log('Cannot stop streaming, not currently streaming', 'red');
				return;
			}

			this.isStreaming = false;
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

		send(command) {
			if (this.client === null)
				new Error('Not connected to QTM. Connect and try again.');

			var promise = Q.resolve();

			// Don't expect a reply on the StreamFrames command.
			if (!_.str.startsWith(command.data, 'StreamFrames'))
				promise = this.promiseResponse();

			this.issuedCommands.unshift(command);

			command.isResponse = false;

			this.client.write(command.buffer, 'utf8', function(data) {
				if (this.options.debug)
					this.logger.logPacket(command);
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

				var discoverPacket = Packet.create(msg, rinfo.address, rinfo.port);

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
					this.logger.logPacket(Packet.create(buf));

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

	mixin(Api.prototype, events.EventEmitter.prototype);

	module.exports = Api;
})();
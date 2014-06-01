'use strict';

var Q       = require('q')
  , _       = require('underscore')
  , colors  = require('colors')
  , qtmrt   = require('./qtmrt')
  , Mangler = require('./mangler').Mangler
  , Packet  = require('./packet')
  , Command = require('./command')
  , Logger  = require('./logger')
;

_.str = require('underscore.string')

var Api = function(options) {
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

	this.options = _.defaults(options, {
		debug: false,
		frequency: 100,
	});

	this.frequency(this.options.frequency);
}

Api.prototype = function()
{
	var bootstrap = function()
	{
		// Disable Nagle's algorithm.
		this.client.setNoDelay(true);

		this.client.on('data', function(chunk) {
			this.mangler.read(chunk, { fun: receivePacket, thisArg: this });
		}.bind(this));

		this.client.on('end', function() {
			this.logger.log('Disconnected', 'white', 'bold');
		}.bind(this));
	},
	
	receivePacket = function(data)
	{
		var packet = Packet.create(data)
		  , command = this.issuedCommands.pop()
		;

		if (qtmrt.COMMAND === packet.type)
			packet.type = qtmrt.COMMAND_RESPONSE;

		if (this.options.debug)
			this.logger.logPacket(packet);

		if (packet.type == qtmrt.EVENT)
		{
			if ('GetState' === command.data)
				this.promiseQueue.pop().resolve({ id: packet.eventId, name: packet.eventName });
		}
		else if (packet.type == qtmrt.XML)
		{
			this.promiseQueue.pop().resolve(packet.toJson());

		}
		else if (packet.type == qtmrt.COMMAND_RESPONSE)
		{
			if (_.str.startsWith(command.data, 'ByteOrder'))
				this.promiseQueue.pop().resolve(/little endian/.test(packet.data) ? 'little endian' : 'big endian');

			else if (_.str.startsWith(command.data, 'QTMVersion'))
			{
				var human   = 'QTM ' + packet.data.replace('QTM Version is ', '').slice(0, -1)
				  , version = human.match(/QTM (\d+)\.(\d+) \(build (\d+)\)/);
				;
				this.promiseQueue.pop().resolve({ major: version[1], minor: version[2], build: version[3], human: human });
			}

			else
				this.promiseQueue.pop().resolve(packet);
		}
		else if (command && _.str.startsWith(command.data, 'GetCurrentFrame'))
		{
			this.promiseQueue.pop().resolve(packet.toJson());
		}
		else if (packet.type != qtmrt.DATA)
		{
			this.promiseQueue.pop().resolve(packet);
		}
		
	},

	checkConnection = function()
	{
		if (_.isNull(this.client))
			return Q.reject(new Error('Not connected to QTM. Connect and try again.'));
	},

	connect = function(port, host, major, minor)
	{
		if (!_.isNull(this.client))
			return Q.reject();

		if (1 > arguments.length)
			port = 22223;

		if (2 > arguments.length)
			host = 'localhost';

		if (3 > arguments.length)
		{
			major = 1;
			minor = 12;
		}
		else
		{
			if (!_.isNumber(major))
				throw TypeError('Major version must be a number');

			if (!_.isNumber(major))
				throw TypeError('Minor version must be a number');
		}
		
		var self = this
		  , deferredCommand  = Q.defer()
		;

		var responsePromise = promiseResponse.call(this);

		if (this.options.debug)
			this.logger.log('Connecting to ' + host + ':' + port, 'white', 'bold');

		this.client = this.net.connect(port, host, function() { });
		this.issuedCommands.unshift('Connect');
		bootstrap.call(this);

		responsePromise
			.then(function(packet) {
				if ('QTM RT Interface connected\0' === packet.data.toString())
				{
					send.call(self, Command.version(major, minor))
						.then(function(data) {
							deferredCommand.resolve();
						})
						.catch(function(err) {
							deferredCommand.reject(new Error(err));
						});
				}
				else
				{
					deferredCommand.reject(new Error(packet.data.toString()));
				}
			})
			.catch(function(err) {
				console.log(err);
			});

		return deferredCommand.promise;
	},

	qtmVersion      = function() { return send.call(this, Command.qtmVersion()) },
	byteOrder       = function() { return send.call(this, Command.byteOrder()) },
	getState        = function() { return send.call(this, Command.getState()) },
	getParameters   = function() { return send.call(this, Command.getParameters.apply(Command, arguments)); },
	getCurrentFrame = function() { return send.call(this, Command.getCurrentFrame.apply(Command, arguments)); },
	releaseControl  = function() { return send.call(this, Command.releaseControl()); },
	newMeasurement  = function() { return send.call(this, Command.newMeasurement()); },
	close           = function() { return send.call(this, Command.close()); },
	start           = function() { return send.call(this, Command.start()); },
	stop            = function() { return send.call(this, Command.stop()); },
	trig            = function() { return send.call(this, Command.trig()); },

	// XXX: Not tested with C3D file reply.
	getCaptureC3D = function() { return send.call(this, Command.getCaptureC3D()); },
	// XXX: Not tested with QTM file reply.
	getCaptureQtm = function() { return send.call(this, Command.getCaptureQtm()); },

	streamFrames = function(options)
	{
		if (this.isStreaming)
			return Q.reject('Could not start streaming, already streaming');

		this.isStreaming = true;

		if (_.isUndefined(options.frequency))
			options.frequency = this.options.frequency;

		return send.call(this, Command.streamFrames.apply(Command, [options]));
	},

	stopStreaming = function()
	{
		if (!this.isStreaming)
		{
			this.logger.log('Cannot stop streaming, not currently streaming', 'red');
			return;
		}

		this.isStreaming = false;
		return send.call(this, Command.stopStreaming());
	},

	takeControl = function(pass)
	{
		if (!_.isUndefined(pass) && !_.isString(pass))
			throw TypeError('Password must be a string');

		return send.call(this, Command.takeControl(pass));
	},

	load = function(filename)
	{
		if (1 > arguments.length)
			throw TypeError('No filename specified');

		if (!_.isString(filename))
			throw TypeError('Filename must be a string');

		return send.call(this, Command.load(filename));
	},

	save = function(filename, overwrite)
	{
		if (1 > arguments.length)
			throw TypeError('No filename specified');

		if (!_.isString(filename))
			throw TypeError('Filename must be a string');

		if (1 < arguments.length)
			overwrite = 'overwrite'

		return send.call(this, Command.save(filename, overwrite));
	},

	loadProject = function(projectPath)
	{
		if (1 > arguments.length)
			throw TypeError('No project path specified');

		if (!_.isString(projectPath))
			throw TypeError('Project path must be a string');

		return send.call(this, Command.loadProject(projectPath));
	},

	setQtmEvent = function(label)
	{
		if (1 > arguments.length)
			throw TypeError('No label specified');

		if (!_.isString(label))
			throw TypeError('Label must be a string');

		return send.call(this, Command.setQtmEvent(label));
	},

	send = function(command)
	{
		checkConnection.call(this);
		var promise = Q.resolve();

		if (!_.str.startsWith(command.data, 'StreamFrames'))
			promise = promiseResponse.call(this);

		this.issuedCommands.unshift(command);

		this.client.write(command.buffer, 'utf8', function(data) {
			if (this.options.debug)
				this.logger.logPacket(command);
		}.bind(this));

		return promise;
	},

	promiseResponse = function()
	{

		var deferredResponse = Q.defer();
		this.promiseQueue.unshift(deferredResponse);
		return deferredResponse.promise;
	},

	disconnect = function()
	{
		checkConnection.call(this);
		this.client.end();
	},

	frequency = function(freq)
	{
		if (isNaN(freq) && freq !== 'AllFrames')
			throw TypeError('Frequency must be a number or \'AllFrames\'');

		this.options.frequency = freq;
	};


	return {
		'connect':          connect,
		'qtmVersion':       qtmVersion,
		'byteOrder':        byteOrder,
		'getState':         getState,
		'getParameters':    getParameters,
		'getCurrentFrame':  getCurrentFrame,
		'stopStreaming':    stopStreaming,
		'streamFrames':     streamFrames,
		'takeControl':      takeControl,
		'releaseControl':   releaseControl,
		'newMeasurement':   newMeasurement,
		'close':            close,
		'start':            start,
		'stop':             stop,
		'load':             load,
		'save':             save,
		'loadProject':      loadProject,
		'getCaptureC3D':    getCaptureC3D,
		'getCaptureQtm':    getCaptureQtm,
		'trig':             trig,
		'setQtmEvent':      setQtmEvent,
		'disconnect':       disconnect,
		'frequency':        frequency,
	}
}();

var api = new Api({ debug: true });

api.connect()
	.then(function() { return api.qtmVersion(); })
	.then(function(version) { return api.byteOrder(); })
	.then(function(byteOrder) { return api.getState(); })
	//.then(function(state) { return api.getCurrentFrame(qtmrt.COMPONENT_ANALOG); })
	//.then(function(frame) { console.log(frame); })
	//.then(function() { return api.getParameters('3D', 'Analog'); })
	//.then(function(parameters) { console.log(parameters); })
	//.then(function() { return api.takeControl('gait1'); })
	//.then(function() { return api.releaseControl(); })
	//.then(function() { return api.newMeasurement(); })
	//.then(function() { return api.takeControl('gait1'); })
	//.then(function() { return api.setQtmEvent('foo_event'); })
	//.then(function() { return api.newMeasurement(); })
	//.then(function() { return api.close(); })
	//.then(function() { return api.start(); })
	//.then(function() { return api.stop(); })
	//.then(function() { return api.load('dadida'); })
	//.then(function() { return api.save('dadida'); })
	//.then(function() { return api.loadProject('dadida'); })
	//.then(function() { return api.trig(); })
	//.then(function() { return api.getCaptureC3D(); })
	//.then(function() { return api.getCaptureQtm(); })
	//.then(function() { return api.stopStreaming(); })
	//.then(function() { return api.streamFrames() })
	//.then(function() { return api.streamFrames({ components: ['All'], frequency: 1/100 }) })
	//.then(function() { return api.stopStreaming() })
	//.then(function() { return api.streamFrames({ components: ['All'], frequency: 1/10 }) })
	//.then(function() { return api.streamFrames({ components: ['All'], frequency: 'AllFrames' }) })
	//.then(function() { return api.streamFrames({ components: ['2D'], frequency: 'AllFrames' }) })
	//.then(function() { return api.streamFrames({ components: ['3D'], frequency: 1/10 }) })
	.then(function() { return api.streamFrames({ components: ['3D'], frequency: 1/100 }) })
	//.then(function() { return api.streamFrames({ components: ['3D'] }) })
	//.then(function() { return api.streamFrames({ components: ['Force', 'Image', 'Analog', 'AnalogSingle', '6D', '3D', '2D'], frequency: 'AllFrames' }) })
	//.then(function() { return api.streamFrames({ frequency: 100, components: ['3DNoLabels'] }); })
	//.then(function() { return api.streamFrames({ frequency: 1/100, components: ['3DRes']); })
	//.then(function() { return api.streamFrames({ frequency: 1/100, components: ['3DNoLabelsRes']); })
	//.then(function() { return api.streamFrames({ frequency: 1/100, components: ['6D'] }); })
	//.then(function() { return api.streamFrames({ frequency: 1/100, components: ['6DRes'] }); })
	//.then(function() { return api.streamFrames({ frequency: 1/100, components: ['6DEuler'] }); })
	//.then(function() { return api.streamFrames({ frequency: 1/100, components: ['6DEulerRes'] }); })
	//.then(function() { return api.streamFrames({ frequency: 1/100, components: ['Analog'] }); })
	//.then(function() { return api.streamFrames({ frequency: 1/100, components: ['AnalogSingle'] }); })
	//.then(function() { return api.streamFrames({ frequency: 1/100, components: ['Force'] }); })
	//.then(function() { return api.streamFrames({ frequency: 1/100, components: ['ForceSingle'] }); })
	//.then(function() { return api.streamFrames({ frequency: 1/100, components: ['Image'] }); })
	//.then(function() { return api.disconnect(); })

	.catch(function(err) {
		console.log(err);
	});


module.exports = Api;

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
	});
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
				this.promiseQueue.pop().resolve(packet);
		}
		else if (packet.type != qtmrt.DATA)
			this.promiseQueue.pop().resolve(packet);
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

	streamFrames = function(frequency, components, updPort)
	{
		if (1 > arguments.length)
			throw TypeError('No frequency specified');

		if (2 > arguments.length)
			throw TypeError('No components specified');

		if (1 < arguments.length && !_.isArray(components))
			throw TypeError('Expected components to be an array');
		
		this.isStreaming = true;
		return send.call(this, Command.streamFrames.apply(Command, arguments));
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

		if (!_.str.startsWith(command, 'StreamFrames'))
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
	}
}();

var api = new Api({ debug: true });
api.connect()
	.then(function() { return api.qtmVersion(); })
	.then(function() { return api.byteOrder(); })
	.then(function() { return api.getState(); })
	//.then(function() { return api.getParameters('All'); })
	//.then(function() { return api.getCurrentFrame('3D'); })
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
	//.then(function() { return api.streamFrames('FrequencyDivisor:100', [qtmrt.COMPONENT_2D]); })
	//.then(function() { return api.streamFrames('FrequencyDivisor:100', [qtmrt.COMPONENT_3D]); })
	//.then(function() { return api.streamFrames('Frequency:100',        [qtmrt.COMPONENT_3D_NO_LABELS]); })
	//.then(function() { return api.streamFrames('FrequencyDivisor:100', [qtmrt.COMPONENT_3D_RESIDUALS]); })
	//.then(function() { return api.streamFrames('FrequencyDivisor:100', [qtmrt.COMPONENT_3D_NO_LABELS_RESIDUALS]); })
	//.then(function() { return api.streamFrames('FrequencyDivisor:100', [qtmrt.COMPONENT_6D]); })
	//.then(function() { return api.streamFrames('FrequencyDivisor:100', [qtmrt.COMPONENT_6D_RESIDUALS]); })
	//.then(function() { return api.streamFrames('FrequencyDivisor:100', [qtmrt.COMPONENT_6D_EULER]); })
	//.then(function() { return api.streamFrames('FrequencyDivisor:100', [qtmrt.COMPONENT_6D_EULER_RESIDUALS]); })
	//.then(function() { return api.streamFrames('FrequencyDivisor:100', [qtmrt.COMPONENT_ANALOG]); })
	//.then(function() { return api.streamFrames('FrequencyDivisor:100', [qtmrt.COMPONENT_ANALOG_SINGLE]); })
	.then(function() { return api.streamFrames('FrequencyDivisor:100', [qtmrt.COMPONENT_FORCE]); })
	//.then(function() { return api.disconnect(); })

	.catch(function(err) {
		console.log(err);
	});


module.exports = Api;

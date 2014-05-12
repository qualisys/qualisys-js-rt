'use strict';

var Q       = require('q')
  , _       = require('underscore')
  , colors  = require('colors')
  , qtmrt   = require('./qtmrt')
  , Packet  = require('./packet').Packet
  , Command = require('./command').Command
  , Logger  = require('./helpers').Logger
;

_.str = require('underscore.string')

var Api = function(options) {
	this.net              = require('net');
	this.client           = null;
	this.response         = null;
	this.deferredResponse = null;
	this.promiseQueue     = [];
	this.issuedCommands   = [];
	this.logger           = new Logger();
	this.chunks           = new Buffer(0);
	this.isStreaming      = false;

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
			var packetSize = Packet.getSize(chunk)
			  , bytesRead  = 0;

			while (this.chunks.length < packetSize && bytesRead < chunk.length) {
				var copySize = Math.min(packetSize, chunk.length - bytesRead);
				this.chunks  = Buffer.concat([this.chunks, chunk.slice(bytesRead, bytesRead + copySize)])
				bytesRead   += copySize;

				if (this.chunks.length === packetSize)
				{
					receivePacket.call(this, this.chunks)
					
					if (bytesRead !== chunk.length)
						packetSize = Packet.getSize(chunk.slice(bytesRead, bytesRead + qtmrt.UINT32_SIZE))

					this.chunks = new Buffer(0);
				}
			}
				
		}.bind(this));

		this.client.on('end', function() {
			this.logger.log('Disconnected', 'white', 'bold');
		}.bind(this));
	},
	
	receivePacket = function(data)
	{
		//var packet = new Packet(data)
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
					send.call(self, new Packet(Command.version(major, minor)))
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

	qtmVersion = function()
	{
		checkConnection.call(this);
		return send.call(this, new Packet(Command.qtmVersion()))
	},

	byteOrder = function()
	{
		checkConnection.call(this);
		return send.call(this, new Packet(Command.byteOrder()))
	},

	getState = function()
	{
		checkConnection.call(this);
		return send.call(this, new Packet(Command.getState()))
	},

	getParameters = function()
	{
		checkConnection.call(this);
		return send.call(this, new Packet(Command.getParameters.apply(Command, arguments)));
	},

	getCurrentFrame = function()
	{
		checkConnection.call(this);
		return send.call(this, new Packet(Command.getCurrentFrame.apply(Command, arguments)));
	},

	streamFrames = function(frequency, components, updPort)
	{
		if (1 > arguments.length)
			throw TypeError('No frequency specified');

		if (2 > arguments.length)
			throw TypeError('No components specified');

		if (1 < arguments.length && !_.isArray(components))
			throw TypeError('Expected components to be an array');
		
		checkConnection.call(this);
		this.isStreaming = true;
		return send.call(this, new Packet(Command.streamFrames.apply(Command, arguments)));
	},

	stopStreaming = function()
	{
		if (!this.isStreaming)
		{
			this.logger.log('Cannot stop streaming, not currently streaming', 'red');
			return;
		}
		checkConnection.call(this);
		this.isStreaming = false;
		return send.call(this, new Packet(Command.stopStreaming()));
	},

	takeControl = function(pass)
	{
		if (!_.isUndefined(pass) && !_.isString(pass))
			throw TypeError('Password must be a string');

		checkConnection.call(this);
		return send.call(this, new Packet(Command.takeControl(pass)));
	},

	releaseControl = function()
	{
		checkConnection.call(this);
		return send.call(this, new Packet(Command.releaseControl()));
	},

	newMeasurement = function()
	{
		checkConnection.call(this);
		return send.call(this, new Packet(Command.newMeasurement()));
	},

	close = function()
	{
		checkConnection.call(this);
		return send.call(this, new Packet(Command.close()));
	},

	start = function()
	{
		checkConnection.call(this);
		return send.call(this, new Packet(Command.start()));
	},

	stop = function()
	{
		checkConnection.call(this);
		return send.call(this, new Packet(Command.stop()));
	},

	load = function(filename)
	{
		if (1 > arguments.length)
			throw TypeError('No filename specified');

 		if (!_.isString(filename))
			throw TypeError('Filename must be a string');

		checkConnection.call(this);
		return send.call(this, new Packet(Command.load(filename)));
	},

	save = function(filename, overwrite)
	{
		if (1 > arguments.length)
			throw TypeError('No filename specified');

 		if (!_.isString(filename))
			throw TypeError('Filename must be a string');

 		if (1 < arguments.length)
			overwrite = 'overwrite'

		checkConnection.call(this);
		return send.call(this, new Packet(Command.save(filename, overwrite)));
	},

	// XXX: Not tested with C3D file reply.
	getCaptureC3D = function()
	{
		checkConnection.call(this);
		return send.call(this, new Packet(Command.getCaptureC3D()));
	},

	// XXX: Not tested with QTM file reply.
	getCaptureQtm = function()
	{
		checkConnection.call(this);
		return send.call(this, new Packet(Command.getCaptureQtm()));
	},

	loadProject = function(projectPath)
	{
		if (1 > arguments.length)
			throw TypeError('No project path specified');

 		if (!_.isString(projectPath))
			throw TypeError('Project path must be a string');

		checkConnection.call(this);
		return send.call(this, new Packet(Command.loadProject(projectPath)));
	},

	trig = function()
	{
		checkConnection.call(this);
		return send.call(this, new Packet(Command.trig()));
	},

	setQtmEvent = function(label)
	{
		if (1 > arguments.length)
			throw TypeError('No label specified');

 		if (!_.isString(label))
			throw TypeError('Label must be a string');

		checkConnection.call(this);
		return send.call(this, new Packet(Command.setQtmEvent(label)));
	},

	disconnect = function()
	{
		checkConnection.call(this);
		this.client.end();
	},

	send = function(command)
	{
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
	.then(function() { return api.streamFrames('FrequencyDivisor:100', ['3D']); })
	//.then(function() { return api.streamFrames('FrequencyDivisor:100', ['3DNoLabels']); })
	//.then(function() { return api.streamFrames('Frequency:100', ['3DNoLabels']); })
	//.then(function() { return api.disconnect(); })

	.catch(function(err) {
		console.log(err);
	});


module.exports = Api;

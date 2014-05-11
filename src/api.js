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
	this.chunks           = null;

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

			if (_.isNull(this.chunks) && chunk.length === Packet.getSize(chunk))
			{
				receivePacket.call(this, chunk);
			}
			else
			{
				if (_.isNull(this.chunks))
					this.chunks = chunk;
				else
					this.chunks = Buffer.concat([this.chunks, chunk], this.chunks.length + chunk.length);

				if (Packet.getSize(this.chunks) === this.chunks.length)
				{
					receivePacket.call(this, this.chunks);
					this.chunks = null;
				}
			}
				
		}.bind(this));

		this.client.on('end', function() {
			console.log('client disconnected');
		});
	},
	
	receivePacket = function(data)
	{
		var packet = new Packet(data)
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
		else
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

	send = function(command)
	{
		var promise = promiseResponse.call(this);
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
		'connect': connect,
		'qtmVersion': qtmVersion,
		'byteOrder': byteOrder,
		'getState': getState,
		'getParameters': getParameters,
		'getCurrentFrame': getCurrentFrame,
		'takeControl': takeControl,
		'releaseControl': releaseControl,
		'newMeasurement': newMeasurement,
		'close': close,
		'start': start,
		'stop': stop,
		'load': load,
		'save': save,
	}
}();

var api = new Api({ debug: true });
api.connect()
	.then(function() {
		return api.qtmVersion();
	})
	.then(function() {
		return api.byteOrder();
	})
	.then(function() {
		return api.getState();
	})
	.then(function() {
		return api.getParameters('All');
	})
	.then(function() {
		return api.getCurrentFrame('3D');
	})
	.then(function() {
		return api.takeControl('gait1');
	})
	.then(function() {
		return api.releaseControl();
	})
	.then(function() {
		return api.newMeasurement();
	})
	.then(function() {
		return api.takeControl('gait1');
	})
	//.then(function() {
		//return api.newMeasurement();
	//})
	//.then(function() {
		//return api.close();
	//})
	//.then(function() {
		//return api.start();
	//})
	//.then(function() {
		//return api.stop();
	//})
	//.then(function() {
		//return api.load('dadida');
	//})
	//.then(function() {
		//return api.save('dadida');
	//})
	.catch(function(err) {
		console.log(err);
	});


module.exports = Api;

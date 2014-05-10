'use strict';

var Q       = require('q')
  , _       = require('underscore')
  , colors  = require('colors')
  , qtmrt   = require('./qtmrt')
  , Packet  = require('./packet').Packet
  , Command = require('./command').Command
;

_.str = require('underscore.string')

var Api = function(options) {
	this.net              = require('net');
	this.client           = null;
	this.response         = null;
	this.deferredResponse = null;
	this.promiseQueue     = [];
	this.issuedCommands   = [];

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

		this.client.on('data', function(data) {
			var packet = new Packet(data);

			var command = this.issuedCommands.pop();

			if (qtmrt.COMMAND === packet.type)
				packet.type = qtmrt.COMMAND_RESPONSE;

			if (this.options.debug)
				console.log(packet.toString());
			
			if (packet.type == qtmrt.EVENT)
			{
				if ('GetState' === command.data)
					this.promiseQueue.pop().resolve(packet);
			}
			else
				this.promiseQueue.pop().resolve(packet);
		}.bind(this));

		this.client.on('end', function() {
			console.log('client disconnected');
		});
	},

	checkConnection = function()
	{
		if (_.isNull(this.client))
			return Q.reject(new Error('Not connected to QTM. Connect and try again.'));
	},

	connect = function()
	{
		if (!_.isNull(this.client))
			return Q.reject();
		
		var self = this
		  , deferredCommand  = Q.defer()
		;

		var responsePromise = promiseResponse.call(this);

		this.client = this.net.connect({ port: 22223 }, function() { });
		bootstrap.call(this);

		responsePromise
			.then(function(packet) {
				if ('QTM RT Interface connected\0' === packet.data.toString())
				{
					send.call(self, new Packet(Command.version('1', '12')))
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

	send = function(command)
	{
		var promise = promiseResponse.call(this);
		this.issuedCommands.unshift(command);

		this.client.write(command.buffer, 'utf8', function(data) {
			if (this.options.debug)
				console.log(command.toString());
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
	.catch(function(err) {
		console.log(err);
	});


module.exports = Api;

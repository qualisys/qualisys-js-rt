'use strict';

var Q       = require('q')
  , _       = require('underscore')
  , colors  = require('colors')
  , qtmrt   = require('./qtmrt')
  , Packet  = require('./packet').Packet
  , Command = require('./command').Command
;

_.str = require('underscore.string')

//var buf = new Buffer(20);
//buf.writeInt32LE(20, 0);
//buf.writeInt32LE(1, 4);
//buf.write('Version 1.12\0', 8, 12, 'utf8');

//console.log('Version 1.12\0'.length + 8);

var Api = function(options) {
	this.net              = require('net');
	this.client           = null;
	this.response         = null;
	this.deferredResponse = null;
	this.promiseQueue     = [];

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

			if (qtmrt.COMMAND === packet.type)
				packet.type = qtmrt.COMMAND_RESPONSE;

			if (this.options.debug)
				console.log(packet.toString());

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

	send = function(command)
	{
		var promise = promiseResponse.call(this);

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
	}
}();

var api = new Api({ debug: true });
api.connect()
	.then(function() {
		return api.qtmVersion();
	})
	.then(function() {
		api.byteOrder();
	})
	.catch(function(err) {
		console.log(err);
	});


module.exports = Api;

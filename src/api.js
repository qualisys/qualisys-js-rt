'use strict';

var Q              = require('q')
  , _              = require('underscore')
  , colors         = require('colors')
  , qtmrt          = require('./qtmrt')
  , Packet         = require('./packet').Packet
  , Command        = require('./command').Command
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

			this.deferredResponse.resolve(packet);
			//client.end();
		}.bind(this));

		this.client.on('end', function() {
			console.log('client disconnected');
		});
	},

	connect = function()
	{
		if (!_.isNull(this.client))
			return Q.reject();
		
		var self = this
		  , deferredCommand  = Q.defer()
		;

		promiseResponse.call(this);

		this.client = this.net.connect({ port: 22223 }, function() { });
		bootstrap.call(this);

		this.response
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
				console.log('wtf');
				console.log(err);
			});

		return deferredCommand.promise;
	},
	send = function(command)
	{
		promiseResponse.call(this);

		// Set proper type.
		//if (qtmrt.COMMAND_RESPONSE === command.type)
			//command.type = qtmrt.COMMAND;
		
		this.client.write(command.buffer, 'utf8', function(data) {
			if (this.options.debug)
				console.log(command.toString());
		}.bind(this));
		return this.response;
	},
	promiseResponse = function()
	{
		var deferredResponse  = Q.defer();
		this.deferredResponse = deferredResponse;
		this.response         = deferredResponse.promise;
	};

	return {
		'connect': connect,
	}
}();

var api = new Api({ debug: true });
api.connect();

module.exports = Api;

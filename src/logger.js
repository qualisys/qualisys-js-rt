'use strict';

var _         = require('underscore')
  , moment    = require('moment')
  , sprintf   = require('sprintf')
  , qtmrt     = require('./qtmrt')
  , Packet    = require('./packet')
  , Component = require('./component')
;

var Logger = function() { };

Logger.prototype = function()
{
	var timestamp = function()
	{
		return '[' + moment().format('HH:mm:ss') + ']';
	},

	log = function(message, color, style)
	{
		if (2 > arguments.length)
			color = 'white';

		message = message[color];

		if (!_.isUndefined(style))
			message = message[style];

		console.log(timestamp.call(this) + ' ' + message);
	},

	logPacket = function(packet)
	{
		var typeColors = { };

		typeColors[qtmrt.ERROR]            = 'red';
		typeColors[qtmrt.COMMAND]          = 'cyan';
		typeColors[qtmrt.XML]              = 'green';
		typeColors[qtmrt.DATA]             = 'white';
		typeColors[qtmrt.NO_MORE_DATA]     = 'grey';
		typeColors[qtmrt.C3D_FILE]         = 'cyan';
		typeColors[qtmrt.EVENT]            = 'yellow';
		typeColors[qtmrt.DISCOVER]         = 'yellow';
		typeColors[qtmrt.QTM_FILE]         = 'cyan';
		typeColors[qtmrt.COMMAND_RESPONSE] = 'green';

		var typeColor = typeColors[packet.type]
		  , value     = packet.data
		;

		// XXX: Move value stuff to toString on packets.
		if (packet.type === qtmrt.EVENT)
		{
			value = packet.eventName;
		}
		else if (packet.type === qtmrt.XML)
		{
			value = packet.data.substr(0, 50).replace(/\r?\n|\r|\s+/g, '') + ' ...';
		}
		else if (packet.type === qtmrt.DATA)
		{
			var componentTypes = '[' + _.keys(packet.components).map(Component.typeToPrettyString).join(', ') + ']';

			value = 'Frame: '      + packet.frameNumber
				+ ', Components: ' + componentTypes
				+ ', Size: '       + packet.size;
		}
		else if (packet.type === qtmrt.C3D)
		{
			value = '<C3D file> (' + (packet.size - qtmrt.HEADER_SIZE) + ' bytes)'
		}
		else if (packet.type === qtmrt.QTM)
		{
			value = '<QTM file> (' + (packet.size - qtmrt.HEADER_SIZE) + ' bytes)'
		}

		this.log(
			(sprintf("%-20s", '<' + Packet.typeToString(packet.type) + '>')
			+ value)[typeColor]
		);
	}
	;

	return {
		'logPacket': logPacket,
		'log': log,
	}
}();

module.exports = Logger;

'use strict';

var _        = require('underscore')
  , moment   = require('moment')
  , sprintf  = require('sprintf')
  , Big      = require('big.js')
  , qtmrt    = require('./qtmrt')
;

var readUInt8 = function(buffer, pos, bytesRead)
{
	if (!_.isUndefined(bytesRead))
		bytesRead.count += qtmrt.UINT8_SIZE;

	return buffer.readUInt8(pos);
}

var readUInt16 = function(buffer, pos, bytesRead)
{
	if (!_.isUndefined(bytesRead))
		bytesRead.count += qtmrt.UINT16_SIZE;

	return qtmrt.byteOrder === qtmrt.LITTLE_ENDIAN 
		? buffer.readUInt16LE(pos) : buffer.readUInt16BE(pos);
}

var readUInt32 = function(buffer, pos, bytesRead)
{
	if (!_.isUndefined(bytesRead))
		bytesRead.count += qtmrt.UINT32_SIZE;

	return qtmrt.byteOrder === qtmrt.LITTLE_ENDIAN 
		? buffer.readUInt32LE(pos) : buffer.readUInt32BE(pos);
}

var readUInt64 = function(buffer, pos)
{
	return qtmrt.byteOrder === qtmrt.LITTLE_ENDIAN 
		? new Big(buffer.readUInt32LE(pos) << 8).plus(buffer.readUInt32LE(pos + 4))
		: new Big(buffer.readUInt32BE(pos) << 8).plus(buffer.readUInt32BE(pos + 4))
}

var readFloat = function(buffer, pos)
{
	return qtmrt.byteOrder === qtmrt.LITTLE_ENDIAN 
		? buffer.readFloatLE(pos) : buffer.readFloatBE(pos);
}

var Logger = function() { }

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
			value = 'Frame: ' + packet.frameNumber
				+ ', Components: ' + packet.componentCount
				+ ', Size: ' + packet.size;
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
			(sprintf("%-20s", '<' + qtmrt.packetTypeToString(packet.type) + '>')
			+ value)[typeColor]
		);
	}
	;

	return {
		'logPacket': logPacket,
		'log': log,
	}
}();

module.exports = {
	Logger: Logger,
	readUInt8: readUInt8,
	readUInt16: readUInt16,
	readUInt32: readUInt32,
	readUInt64: readUInt64,
	readFloat: readFloat,
}

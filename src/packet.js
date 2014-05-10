'use strict';

var moment  = require('moment')
  , sprintf = require('sprintf')
  , Model   = require('./model')
  , qtmrt   = require('./qtmrt')
;

var Packet = Model.extend(
	{
		init: function(buf, byteOrder)
		{
			this.buffer    = buf;
			this.byteOrder = qtmrt.BYTE_ORDER;

			if (!arguments.length)
				throw TypeError('No buffer specified');

			if (1 < arguments.length)
				if (byteOrder !== qtmrt.LITTLE_ENDIAN || byteOrder !== qtmrt.BIG_ENDIAN)
					throw TypeError('Unexpected byte order.');
				else
					this.byteOrder = byteOrder;


			if (qtmrt.byteOrder === qtmrt.LITTLE_ENDIAN)
			{
				this.size = buf.readUInt32LE(0);
				this.type = buf.readUInt32LE(qtmrt.HEADER_SIZE_SIZE);
			}
			else
			{
				this.size = buf.readUInt32BE(0);
				this.type = buf.readUInt32BE(qtmrt.HEADER_SIZE_SIZE);
			}

			this.data     = buf.slice(qtmrt.HEADER_SIZE).toString('utf8');
			this.typeName = Packet.typeToString(this.type);
		},

		toString: function()
		{
			var typeColors = { };

			typeColors[qtmrt.ERROR]            = 'red';
			typeColors[qtmrt.COMMAND]          = 'cyan';
			typeColors[qtmrt.XML_DATA]         = 'cyan';
			typeColors[qtmrt.DATA]             = 'white';
			typeColors[qtmrt.NO_MORE_DATA]     = 'grey';
			typeColors[qtmrt.C3D_FILE]         = 'cyan';
			typeColors[qtmrt.EVENT]            = 'yellow';
			typeColors[qtmrt.DISCOVER]         = 'yellow';
			typeColors[qtmrt.QTM_FILE]         = 'cyan';
			typeColors[qtmrt.COMMAND_RESPONSE] = 'green';

			var typeColor = typeColors[this.type];

			return '[' + moment().format('HH:mm:ss') + '] '
				+ (sprintf("%-20s", '<' + Packet.typeToString(this.type) + '>')
				+ this.data)[typeColor];
		}
	}
);

//Packet.parseMessage = function(buf)
//{
	//return new Packet(buf);
	//return {
		//size: buf.readInt32LE(0),
		//type: buf.readInt32LE(4),
		//data: buf.slice(8, -1),
	//}
//};

Packet.typeToString = function(typeId)
{
	var typeNames = {};

	typeNames[qtmrt.ERROR]            = 'Error';
	typeNames[qtmrt.COMMAND]          = 'Command';
	typeNames[qtmrt.XML_DATA]         = 'XML Data';
	typeNames[qtmrt.DATA]             = 'Data';
	typeNames[qtmrt.NO_MORE_DATA]     = 'No More Data';
	typeNames[qtmrt.C3D_FILE]         = 'C3D file';
	typeNames[qtmrt.EVENT]            = 'Event';
	typeNames[qtmrt.DISCOVER]         = 'Discover';
	typeNames[qtmrt.QTM_FILE]         = 'QTM file';
	typeNames[qtmrt.COMMAND_RESPONSE] = 'Command Response';

	return typeNames[typeId];
};


module.exports = {
	Packet: Packet,
}

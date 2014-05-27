'use strict';

var _          = require('underscore')
  , Model      = require('./model')
  , qtmrt      = require('./qtmrt')
  , readUInt32 = require('./mangler').readUInt32
  , readUInt64 = require('./mangler').readUInt64
  , Component  = require('./component')
;

var packetTypeToString = function(typeId)
{
	var typeNames = {};

	typeNames[qtmrt.ERROR]            = 'Error';
	typeNames[qtmrt.COMMAND]          = 'Command';
	typeNames[qtmrt.XML]              = 'XML';
	typeNames[qtmrt.DATA]             = 'Data';
	typeNames[qtmrt.NO_MORE_DATA]     = 'No More Data';
	typeNames[qtmrt.C3D_FILE]         = 'C3D file';
	typeNames[qtmrt.EVENT]            = 'Event';
	typeNames[qtmrt.DISCOVER]         = 'Discover';
	typeNames[qtmrt.QTM_FILE]         = 'QTM file';
	typeNames[qtmrt.COMMAND_RESPONSE] = 'Command Response';

	return typeNames[typeId];
};

var Packet = Model.extend(
	{
		init: function(buf)
		{
			if (!arguments.length)
				throw TypeError('No buffer specified');

			this.buffer   = buf;
			this.size     = readUInt32(buf, 0);
			this.type     = readUInt32(buf, qtmrt.UINT32_SIZE);
			this.typeName = packetTypeToString(this.type);
			this.data     = buf.slice(qtmrt.HEADER_SIZE).toString('utf8');
		},
	}
);

var ErrorPacket = Model.extend(
	{
	},
	Packet
);

var CommandPacket = Model.extend(
	{
	},
	Packet
);

var XmlPacket = Model.extend(
	{
	},
	Packet
);

var DataPacket = Model.extend(
	{
		init: function(buf)
		{
			Packet.init.call(this, buf);
			
			this.timestamp      = readUInt64(buf, qtmrt.HEADER_SIZE);
			this.frameNumber    = readUInt32(buf, qtmrt.HEADER_SIZE + qtmrt.UINT64_SIZE);
			this.componentCount = readUInt32(buf, qtmrt.HEADER_SIZE + qtmrt.UINT64_SIZE + qtmrt.UINT32_SIZE);
			this.components     = {};

			var offset = qtmrt.DATA_FRAME_HEADER_SIZE;

			for (var i = 0; i < this.componentCount; i++) {
				var size      = readUInt32(buf, offset)
				  , component = Component.create(buf.slice(offset, offset + size))
				;
				offset += size;

				this.components[component.type] = component;
			}
		},
		component: function(componentString)
		{
			if (!_.contains(qtmrt.COMPONENT_STRINGS, componentString))
				throw new TypeError('Unexpected component');

			return this.components[Component.stringToType(componentString)];
		}
	},
	Packet
);

var NoMoreDataPacket = Model.extend(
	{
	},
	Packet
);

var C3dFilePacket = Model.extend(
	{
	},
	Packet
);

var EventPacket = Model.extend(
	{
		init: function(buf)
		{
			Packet.init.call(this, buf);
			this.data      = buf.readUInt8(qtmrt.HEADER_SIZE);
			this.eventId   = this.data
			this.eventName = qtmrt.eventToString(this.eventId);
		}
	},
	Packet
);

var DiscoverPacket = Model.extend(
	{
	},
	Packet
);

var QtmFilePacket = Model.extend(
	{
	},
	Packet
);

Packet.create = function(buf)
{
	var type = readUInt32(buf, qtmrt.UINT32_SIZE);

	switch (type) {
		case qtmrt.ERROR:         return new ErrorPacket(buf); break;
		case qtmrt.COMMAND:       return new CommandPacket(buf); break;
		case qtmrt.XML:           return new XmlPacket(buf); break;
		case qtmrt.DATA:          return new DataPacket(buf); break;
		case qtmrt.NO_MORE_DATA:  return new NoMoreDataPacket(buf); break;
		case qtmrt.C3D_FILE:      return new C3dFilePacket(buf); break;
		case qtmrt.EVENT:         return new EventPacket(buf); break;
		case qtmrt.DISCOVER:      return new DiscoverPacket(buf); break;
		case qtmrt.QTM_FILE:      return new QtmFilePacket(buf); break;
	}
};

Packet.typeToString = packetTypeToString;

module.exports = Packet;

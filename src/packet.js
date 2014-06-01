'use strict';

var _          = require('underscore')
  , qtmrt      = require('./qtmrt')
  , readUInt32 = require('./mangler').readUInt32
  , Model      = require('./model')
  , Muncher    = require('./muncher')
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

			Muncher.init.call(this, buf);

			this.size     = this.munchUInt32();
			this.type     = this.munchUInt32();
			this.typeName = packetTypeToString(this.type);
			this.data     = buf.slice(this.munched).toString('utf8');
		},
	}, Muncher
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
			
			this.timestamp      = this.munchUInt64();
			this.frameNumber    = this.munchUInt32();
			this.componentCount = this.munchUInt32();
			this.components     = {};

			var offset = this.munched;

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
		},
		
		toJson: function()
		{
			var json = {
				frame: this.frameNumber,
				timestamp: this.timestamp,
				components: [],
			};

			for (var type in this.components) {
				json.components.push(this.components[type].toJson());
			};

			return json;
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
			this.data      = this.munchUInt8();
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

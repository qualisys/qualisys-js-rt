'use strict';

var _          = require('underscore')
  , parseString = require('xml2js').parseString
  , qtmrt      = require('./qtmrt')
  , readUInt32 = require('./helpers').readUInt32
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
		init: function(buf)
		{
			Packet.init.call(this, buf);

			this.data = buf.slice(this.munched, buf.length - 1).toString('utf8');
		},

		toJson: function()
		{
			var underscoreCased = this.data.replace(/[a-z]([A-Z])/g, function (g) { return g[0] + '_' + g[1]; })
			  , camelCased      = underscoreCased.toLowerCase().replace(/_([a-zA-Z0-9])/g, function (g) { return g[1].toUpperCase(); })
			  , jsonData        = null
			;

			parseString(camelCased, function(err, result) { jsonData = result; });

			for (var i in jsonData) {
				var keys = Object.keys(jsonData[i]);

				if (1 === keys.length)
					return jsonData[i][keys[0]];
				else
					return jsonData[i];
			}
		}
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
		init: function(buf)
		{
			Packet.init.call(this, buf);
			this.serverInfo = this.munch(this.size - this.munched - qtmrt.UINT16_SIZE).toString('utf8');
			this.serverBasePort = this.munchUInt16();
		}
	},
	Packet
);

var QtmFilePacket = Model.extend(
	{
	},
	Packet
);

Packet.create = function(buf, srcAddress, srcPort)
{
	var type   = readUInt32(buf, qtmrt.UINT32_SIZE)
	  , packet = null
	;

	switch (type) {
		case qtmrt.ERROR:         packet = new ErrorPacket(buf); break;
		case qtmrt.COMMAND:       packet = new CommandPacket(buf); break;
		case qtmrt.XML:           packet = new XmlPacket(buf); break;
		case qtmrt.DATA:          packet = new DataPacket(buf); break;
		case qtmrt.NO_MORE_DATA:  packet = new NoMoreDataPacket(buf); break;
		case qtmrt.C3D_FILE:      packet = new C3dFilePacket(buf); break;
		case qtmrt.EVENT:         packet = new EventPacket(buf); break;
		case qtmrt.DISCOVER:      packet = new DiscoverPacket(buf); break;
		case qtmrt.QTM_FILE:      packet = new QtmFilePacket(buf); break;
	}

	if (1 < arguments.length)
	{
		packet.srcAddress = srcAddress;
		packet.srcPort    = srcPort;
	}

	return packet;
};

Packet.typeToString = packetTypeToString;

module.exports = Packet;

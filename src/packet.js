'use strict';

(function() {
	var _             = require('lodash')
	  , parseString   = require('xml2js').parseString
	  , parseNumbers  = require('xml2js').processors.parseNumbers
	  , parseBooleans = require('xml2js').processors.parseBooleans
	  , qtmrt         = require('./qtmrt')
	  , toCamelCase   = require('./helpers').toCamelCase
	  , readUInt32    = require('./buffer-io').readUInt32
	  , Muncher       = require('./muncher')
	  , Component     = require('./component')
	;

	class Packet extends Muncher {
		constructor(buf, byteOrder) {
			if (!arguments.length)
				throw new TypeError('No buffer specified');

			super(buf, byteOrder);

			this.size       = this.munchUInt32();
			this.type       = this.munchUInt32();
			this.typeName   = Packet.typeToString(this.type);
			this.data       = buf.slice(this.munched).toString('utf8');
			this.isResponse = true;
		}

		static create(buf, byteOrder, srcAddress, srcPort) {
			var type   = readUInt32(buf, qtmrt.UINT32_SIZE, null, byteOrder)
			  , packet = null
			;

			switch (type) {
				case qtmrt.ERROR:         packet = new ErrorPacket(buf, byteOrder); break;
				case qtmrt.COMMAND:       packet = new CommandPacket(buf, byteOrder); break;
				case qtmrt.XML:           packet = new XmlPacket(buf, byteOrder); break;
				case qtmrt.DATA:          packet = new DataPacket(buf, byteOrder); break;
				case qtmrt.NO_MORE_DATA:  packet = new NoMoreDataPacket(buf, byteOrder); break;
				case qtmrt.C3D_FILE:      packet = new C3dFilePacket(buf, byteOrder); break;
				case qtmrt.EVENT:         packet = new EventPacket(buf, byteOrder); break;
				case qtmrt.DISCOVER:      packet = new DiscoverPacket(buf, byteOrder); break;
				case qtmrt.QTM_FILE:      packet = new QtmFilePacket(buf, byteOrder); break;
			}

			if (arguments.length > 2) {
				packet.srcAddress = srcAddress;
				packet.srcPort    = srcPort;
			}

			return packet;
		}

		static typeToString(typeId) {
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
		}
	}

	class NoMoreDataPacket extends Packet {}
	class C3dFilePacket    extends Packet {}
	class QtmFilePacket    extends Packet {}
	class ErrorPacket      extends Packet {}
	class CommandPacket    extends Packet {}

	class XmlPacket extends Packet {
		toJson() {
			var camelCased = toCamelCase(this.data)
			  , jsonData   = null
			;

			var parseOptions = {
				async: false,
				mergeAttrs: true,
				explicitArray: false,
				attrValueProcessors: [
					parseNumbers,
					parseBooleans
				],
				valueProcessors: [
					parseNumbers,
					parseBooleans
				],
			};

			parseString(camelCased, parseOptions, function(err, result) {
				if (!result) return;

				var keys = Object.keys(result);

				jsonData = (keys.length === 1) ? result[keys[0]] : result;

				// Simplify result somewhat.
				if (jsonData.the3d) {
					if (jsonData.the3d.bones)
						jsonData.the3d.bones = jsonData.the3d.bones.bone;

					if (jsonData.the3d.label) {
						jsonData.the3d.labels = jsonData.the3d.label;
						delete jsonData.the3d.label;
					}
				}

				if (jsonData.skeletons) {
					jsonData.skeletons = jsonData.skeletons.skeleton;

					for (let i in jsonData.skeletons) {
						jsonData.skeletons[i].segments = jsonData.skeletons[i].segment;
						delete jsonData.skeletons[i].segment;
					}
				}

				if (jsonData.the6d) {
					if (jsonData.the6d.bodies) {
						jsonData.the6d.rigidBodies = jsonData.the6d.body;
						delete jsonData.the6d.body;
						delete jsonData.the6d.bodies;
					}
				}

				if (jsonData.eyeTracker) {

				}
			});

			return jsonData;
		}
	}

	class DataPacket extends Packet {
		constructor(buf, byteOrder) {
			super(buf, byteOrder);

			this.timestamp      = this.munchUInt64();
			this.frameNumber    = this.munchUInt32();
			this.componentCount = this.munchUInt32();
			this.components     = {};

			var offset = this.munched;

			for (var i = 0; i < this.componentCount; i++) {
				var size      = readUInt32(buf, offset, null, byteOrder)
				  , component = Component.create(buf.slice(offset, offset + size), byteOrder)
				;

				offset += size;

				this.components[component.type] = component;
			}
		}

		component(componentString) {
			if (!_.includes(Object.keys(qtmrt.COMPONENTS), componentString))
				throw new TypeError('Unexpected component');

			return this.components[Component.stringToType(componentString)];
		}

		toJson() {
			var json = {
				frame: this.frameNumber,
				timestamp: this.timestamp,
				components: {},
			};

			for (var type in this.components) {
				json.components[toCamelCase(Component.typeToString(type))] = (this.components[type].toJson());
			}

			return json;
		}
	}

	class EventPacket extends Packet {
		constructor(buf, byteOrder) {
			super(buf, byteOrder);

			this.data      = this.munchUInt8();
			this.eventId   = this.data;
			this.eventName = qtmrt.eventToString(this.eventId);
		}

		toJson() {
			return { name: this.eventName, id: this.eventId };
		}
	}

	class DiscoverPacket extends Packet {
		constructor(buf, byteOrder) {
			// Size and type of discover packets are always sent with little endian byte order.
			super(buf, qtmrt.LITTLE_ENDIAN);

			this.byteOrder      = byteOrder;
			this.serverInfo     = this.munch(this.size - this.munched - qtmrt.UINT16_SIZE).toString('utf8');
			this.serverBasePort = this.munchUInt16();
		}
	}

	module.exports = Packet;
})();
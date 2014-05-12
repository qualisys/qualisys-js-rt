'use strict';

var Model      = require('./model')
  , qtmrt      = require('./qtmrt')
  , readUInt32 = require('./helpers').readUInt32
  , readUInt64 = require('./helpers').readUInt64
  , Component  = require('./component')
;

var Packet = Model.extend(
	{
		init: function(buf)
		{
			if (!arguments.length)
				throw TypeError('No buffer specified');

			this.buffer   = buf;
			this.size     = readUInt32(buf, 0);
			this.type     = readUInt32(buf, qtmrt.UINT32_SIZE);
			this.typeName = qtmrt.packetTypeToString(this.type);
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
			this._super.init.call(this, buf);
			
			this.timestamp      = readUInt64(buf, qtmrt.HEADER_SIZE);
			this.frameNumber    = readUInt32(buf, qtmrt.HEADER_SIZE + qtmrt.UINT64_SIZE);
			this.componentCount = readUInt32(buf, qtmrt.HEADER_SIZE + qtmrt.UINT64_SIZE + qtmrt.UINT32_SIZE);
			this.components     = [];

			var offset = qtmrt.DATA_FRAME_HEADER_SIZE;

			for (var i = 0; i < this.componentCount; i++) {
				var size = readUInt32(buf, offset);
				this.components.push(Component.create(buf.slice(offset, offset + size)));
			}
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
			this._super.init.call(this, buf);
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

		case qtmrt.ERROR:
			return new ErrorPacket(buf);
		break;
		
		case qtmrt.COMMAND:
			return new CommandPacket(buf);
		break;
		
		case qtmrt.XML:
			return new XmlPacket(buf);
		break;
		
		case qtmrt.DATA:
			return new DataPacket(buf);
		break;
		
		case qtmrt.NO_MORE_DATA:
			return new NoMoreDataPacket(buf);
		break;
		
		case qtmrt.C3D_FILE:
			return new C3dFilePacket(buf);
		break;
		
		case qtmrt.EVENT:
			return new EventPacket(buf);
		break;
		
		case qtmrt.DISCOVER:
			return new DiscoverPacket(buf);
		break;
		
		case qtmrt.QTM_FILE:
			return new QtmFilePacket(buf);
		break;
	}
};

Packet.getSize = function(buf)
{
	return readUInt32(buf, 0);
};

module.exports = {
	Packet: Packet,
}

'use strict';

var Model   = require('./model')
  , qtmrt   = require('./qtmrt')
;

var Packet = Model.extend(
	{
		init: function(buf, byteOrder)
		{
			this.buffer    = buf;
			this.byteOrder = qtmrt.BYTE_ORDER;
			this.eventName = null;

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

				if (this.type === qtmrt.EVENT)
					this.data = buf.readUInt8(qtmrt.HEADER_SIZE);
			}
			else
			{
				this.size = buf.readUInt32BE(0);
				this.type = buf.readUInt32BE(qtmrt.HEADER_SIZE_SIZE);

				if (this.type === qtmrt.EVENT)
					this.data = buf.readUInt32BE(qtmrt.HEADER_SIZE);
			}

			if (this.type === qtmrt.EVENT)
			{
				this.eventName = Packet.eventToString(this.data);
			}
			else
			{
				this.data = buf.slice(qtmrt.HEADER_SIZE).toString('utf8');
			}
			
			this.typeName = Packet.typeToString(this.type);

		},
	}
);

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

Packet.eventToString = function(eventId)
{
	var eventNames = {};

	eventNames[qtmrt.CONNECTED]               = 'Connected';
	eventNames[qtmrt.CONNECTION_CLOSED]       = 'Connection Closed';
	eventNames[qtmrt.CAPTURE_STARTED]         = 'Capture Started';
	eventNames[qtmrt.CAPTURE_STOPPED]         = 'Capture Stopped';
	eventNames[qtmrt.FETCHING_FINISHED]       = 'Fetching Finished';
	eventNames[qtmrt.CALIBRATION_STARTED]     = 'Calibration Started';
	eventNames[qtmrt.CALIBRATION_STOPPED]     = 'Calibration Stopped';
	eventNames[qtmrt.RT_FROM_FILE_STARTED]    = 'RT From File Started';
	eventNames[qtmrt.RT_FRON_FILE_STOPPED]    = 'RT From File Stopped';
	eventNames[qtmrt.WAITING_FOR_TRIGGER]     = 'Waiting For Trigger';
	eventNames[qtmrt.CAMERA_SETTINGS_CHANGED] = 'Camera Settings Changed';
	eventNames[qtmrt.QTM_SHUTTING_DOWN]       = 'QTM Shutting Down';
	eventNames[qtmrt.CAPTURE_SAVED]           = 'Capture Saved';

	return eventNames[eventId];
};


module.exports = {
	Packet: Packet,
}

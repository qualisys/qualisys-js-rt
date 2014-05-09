'use strict';

var _      = require('underscore')
  , qtmrt  = require('./qtmrt')
  , Model  = require('./model')
  , Packet = require('./packet').Packet
;

var Command = {
	build: function(cmdStr)
	{
		var buf = new Buffer(qtmrt.HEADER_SIZE + cmdStr.length);
		
		if (qtmrt.byteOrder == qtmrt.LITTLE_ENDIAN)
		{
			buf.writeUInt32LE(buf.length, 0);
			buf.writeUInt32LE(qtmrt.COMMAND, 4);
		}
		else
		{
			buf.writeUInt32BE(buf.length);
			buf.writeUInt32BE(qtmrt.COMMAND, qtmrt.HEADER_SIZE_SIZE);
		}

		buf.write(cmdStr, qtmrt.HEADER_SIZE, cmdStr.length, 'utf8');
		buf.isCommand = true;

		return buf;
	},

	version: function(major, minor)
	{
		var cmdStr = 'Version ' + major + '.' + minor;
		return this.build(cmdStr);
	}
};

//var cmdBuf = Command.version('1', '20');
//var v = new Packet(Command.version('1', '20'));

module.exports = {
	Command: Command,
}

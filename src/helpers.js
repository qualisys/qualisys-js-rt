'use strict';

var _     = require('underscore')
  , Big   = require('big.js')
  , qtmrt = require('./qtmrt')
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

var readFloat = function(buffer, pos, bytesRead)
{
	if (!_.isUndefined(bytesRead))
		bytesRead.count += qtmrt.FLOAT_SIZE;

	return qtmrt.byteOrder === qtmrt.LITTLE_ENDIAN 
		? buffer.readFloatLE(pos) : buffer.readFloatBE(pos);
}

var writeUInt32 = function(buffer, pos, value)
{
	return qtmrt.byteOrder === qtmrt.LITTLE_ENDIAN 
		? buffer.writeUInt32LE(value, pos) : buffer.writeUInt32BE(value, pos);
}

module.exports = {
	readUInt8: readUInt8,
	readUInt16: readUInt16,
	readUInt32: readUInt32,
	readUInt64: readUInt64,
	readFloat: readFloat,
	writeUInt32: writeUInt32,
};

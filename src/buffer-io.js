'use strict';

(function() {
	var _     = require('lodash')
	  , Big   = require('big.js')
	;

	const FLOAT_SIZE    = 4
	    , UINT8_SIZE    = 1
	    , UINT16_SIZE   = 2
	    , UINT32_SIZE   = 4
	    , UINT64_SIZE   = 8
	    , LITTLE_ENDIAN = 'LE'
	;

	var readUInt8 = function(buffer, offset, bytesRead) {
		if (!_.isUndefined(bytesRead) && bytesRead !== null)
			bytesRead.count += UINT8_SIZE;

		return buffer.readUInt8(offset);
	};

	var readUInt16 = function(buffer, offset, bytesRead, byteOrder) {
		if (!_.isUndefined(bytesRead) && bytesRead !== null)
			bytesRead.count += UINT16_SIZE;

		return (arguments.length < 4 || byteOrder === LITTLE_ENDIAN)
			? buffer.readUInt16LE(offset) : buffer.readUInt16BE(offset);
	};

	var readUInt32 = function(buffer, offset, bytesRead, byteOrder) {
		if (!_.isUndefined(bytesRead) && bytesRead !== null)
			bytesRead.count += UINT32_SIZE;

		return (arguments.length < 4 || byteOrder === LITTLE_ENDIAN)
			? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset);
	};

	var readUInt64 = function(buffer, offset, bytesRead, byteOrder) {
		if (!_.isUndefined(bytesRead) && bytesRead !== null)
			bytesRead.count += UINT64_SIZE;

		return (arguments.length < 4 || byteOrder === LITTLE_ENDIAN)
			? new Big(buffer.readUInt32LE(offset) << 8).plus(buffer.readUInt32LE(offset + 4))
			: new Big(buffer.readUInt32BE(offset) << 8).plus(buffer.readUInt32BE(offset + 4));
	};

	var readFloat = function(buffer, offset, bytesRead, byteOrder) {
		if (!_.isUndefined(bytesRead) && bytesRead !== null)
			bytesRead.count += FLOAT_SIZE;

		return (arguments.length < 4 || byteOrder === LITTLE_ENDIAN)
			? buffer.readFloatLE(offset) : buffer.readFloatBE(offset);
	};

	var writeUInt32 = function(buffer, value, offset, byteOrder) {
		return (arguments.length < 4 || byteOrder === LITTLE_ENDIAN)
			? buffer.writeUInt32LE(value, offset) : buffer.writeUInt32BE(value, offset);
	};

	module.exports = {
		readUInt8: readUInt8,
		readUInt16: readUInt16,
		readUInt32: readUInt32,
		readUInt64: readUInt64,
		readFloat: readFloat,
		writeUInt32: writeUInt32,
	};
})();
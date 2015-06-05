'use strict';

(function() {
	var _     = require('underscore')
	  , Big   = require('big.js')
	  , qtmrt = require('./qtmrt')
	;

	var readUInt8 = function(buffer, offset, bytesRead)
	{
		if (!_.isUndefined(bytesRead))
			bytesRead.count += qtmrt.UINT8_SIZE;

		return buffer.readUInt8(offset);
	};

	var readUInt16 = function(buffer, offset, bytesRead)
	{
		if (!_.isUndefined(bytesRead))
			bytesRead.count += qtmrt.UINT16_SIZE;

		return qtmrt.byteOrder === qtmrt.LITTLE_ENDIAN 
			? buffer.readUInt16LE(offset) : buffer.readUInt16BE(offset);
	};

	var readUInt32 = function(buffer, offset, bytesRead)
	{
		if (!_.isUndefined(bytesRead))
			bytesRead.count += qtmrt.UINT32_SIZE;

		return qtmrt.byteOrder === qtmrt.LITTLE_ENDIAN 
			? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset);
	};

	var readUInt64 = function(buffer, offset)
	{
		return qtmrt.byteOrder === qtmrt.LITTLE_ENDIAN 
			? new Big(buffer.readUInt32LE(offset) << 8).plus(buffer.readUInt32LE(offset + 4))
			: new Big(buffer.readUInt32BE(offset) << 8).plus(buffer.readUInt32BE(offset + 4));
	};

	var readFloat = function(buffer, offset, bytesRead)
	{
		if (!_.isUndefined(bytesRead))
			bytesRead.count += qtmrt.FLOAT_SIZE;

		return qtmrt.byteOrder === qtmrt.LITTLE_ENDIAN 
			? buffer.readFloatLE(offset) : buffer.readFloatBE(offset);
	};

	var writeUInt32 = function(buffer, value, offset)
	{
		return qtmrt.byteOrder === qtmrt.LITTLE_ENDIAN 
			? buffer.writeUInt32LE(value, offset) : buffer.writeUInt32BE(value, offset);
	};

	var mixin = function(proto, otherProto)
	{
		for (var i in otherProto)
			proto[i] = otherProto[i];
	};

	var toCamelCase = function(str) {
		var underscoreCased = str.replace(/[a-z]([A-Z])/g, function (g) { return g[0] + '_' + g[1]; });
		underscoreCased = underscoreCased.replace(/[A-Z]+([A-Z])[a-z]/g, function (g) { return g.substr(0, g.length -2) + '_' + g.substr(g.length - 2);  });
		return underscoreCased.toLowerCase().replace(/_([a-zA-Z0-9])/g, function (g) { return g[1].toUpperCase(); });
	};

	module.exports = {
		readUInt8: readUInt8,
		readUInt16: readUInt16,
		readUInt32: readUInt32,
		readUInt64: readUInt64,
		readFloat: readFloat,
		writeUInt32: writeUInt32,
		mixin: mixin,
		toCamelCase: toCamelCase,
	};
})();

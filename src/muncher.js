'use strict';

(function() {
	var readUInt8  = require('./buffer-io').readUInt8
	  , readUInt16 = require('./buffer-io').readUInt16
	  , readUInt32 = require('./buffer-io').readUInt32
	  , readUInt64 = require('./buffer-io').readUInt64
	  , readFloat  = require('./buffer-io').readFloat
	  , qtmrt      = require('./qtmrt')
	;

	class Muncher {
		constructor(buf) {
			this.buffer  = buf;
			this.munched = 0;
		}

		munch(length) {
			if (!arguments.length)
				length = this.buffer.length - this.munched;

			var result = this.buffer.slice(this.munched, this.munched + length);
			this.munched += length;

			return result;
		}

		munchUInt8(endian) {
			var littleEndian = arguments.length === 0 || endian === qtmrt.LITTLE_ENDIAN;
			var result = readUInt8(this.buffer, this.munched, null, littleEndian);
			this.munched += 1;

			return isNaN(result) ? null : result;
		}

		munchUInt16(endian) {
			var littleEndian = arguments.length === 0 || endian === qtmrt.LITTLE_ENDIAN;
			var result = readUInt16(this.buffer, this.munched, null, littleEndian);
			this.munched += 2;

			return isNaN(result) ? null : result;
		}

		munchUInt32(endian) {
			var littleEndian = arguments.length === 0 || endian === qtmrt.LITTLE_ENDIAN;
			var result = readUInt32(this.buffer, this.munched, null, littleEndian);
			this.munched += 4;

			return isNaN(result) ? null : result;
		}

		munchUInt64(endian) {
			var littleEndian = arguments.length === 0 || endian === qtmrt.LITTLE_ENDIAN;
			var result = readUInt64(this.buffer, this.munched, null, littleEndian);
			this.munched += 8;

			return isNaN(result) ? null : result;
		}

		munchFloat(endian) {
			var littleEndian = arguments.length === 0 || endian === qtmrt.LITTLE_ENDIAN;
			var result = readFloat(this.buffer, this.munched, null, littleEndian);
			this.munched += 4;

			return isNaN(result) ? null : result;
		}
	}

	module.exports = Muncher;
})();
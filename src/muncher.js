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
		constructor(buf, byteOrder) {
			this.buffer  = buf;
			this.munched = 0;
			this.byteOrder = arguments.length < 2 ? qtmrt.LITTLE_ENDIAN : byteOrder;
		}

		munch(length) {
			if (!arguments.length)
				length = this.buffer.length - this.munched;

			var result = this.buffer.slice(this.munched, this.munched + length);
			this.munched += length;

			return result;
		}

		munchUInt8(byteOrder) {
			byteOrder = (arguments.length > 0) ? byteOrder : this.byteOrder;

			var result = readUInt8(this.buffer, this.munched, null, byteOrder);
			this.munched += 1;

			return isNaN(result) ? null : result;
		}

		munchUInt16(byteOrder) {
			byteOrder = (arguments.length > 0) ? byteOrder : this.byteOrder;

			var result = readUInt16(this.buffer, this.munched, null, byteOrder);
			this.munched += 2;

			return isNaN(result) ? null : result;
		}

		munchUInt32(byteOrder) {
			byteOrder = (arguments.length > 0) ? byteOrder : this.byteOrder;

			var result = readUInt32(this.buffer, this.munched, null, byteOrder);
			this.munched += 4;

			return isNaN(result) ? null : result;
		}

		munchUInt64(byteOrder) {
			byteOrder = (arguments.length > 0) ? byteOrder : this.byteOrder;

			var result = readUInt64(this.buffer, this.munched, null, byteOrder);
			this.munched += 8;

			return isNaN(result) ? null : result;
		}

		munchFloat(byteOrder) {
			byteOrder = (arguments.length > 0) ? byteOrder : this.byteOrder;

			var result = readFloat(this.buffer, this.munched, null, byteOrder);
			this.munched += 4;

			return isNaN(result) ? null : result;
		}
	}

	module.exports = Muncher;
})();
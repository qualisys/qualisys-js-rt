'use strict';

(function() {
	var qtmrt      = require('./qtmrt')
	  , readUInt32 = require('./buffer-io').readUInt32
	;

	class Mangler {
		constructor() {
			this.chunks            = Buffer.alloc(0);
			this.currentPacketSize = null;
		}

		read(chunk, byteOrder, callback) {
			var bytesRead = 0;

			// New packet.
			if (this.chunks.length === 0)
				this.currentPacketSize = readUInt32(chunk, 0, null, byteOrder);

			while (this.chunks.length < this.currentPacketSize && bytesRead < chunk.length) {
				var copySize = Math.min(this.currentPacketSize - this.chunks.length, chunk.length - bytesRead);
				this.chunks  = Buffer.concat([this.chunks, chunk.slice(bytesRead, bytesRead + copySize)]);
				bytesRead   += copySize;

				if (this.chunks.length === this.currentPacketSize) {
					callback.fun.call(callback.thisArg, this.chunks);

					if (bytesRead !== chunk.length)
						this.currentPacketSize = readUInt32(chunk.slice(bytesRead, bytesRead + qtmrt.UINT32_SIZE, null, byteOrder), 0);

					this.chunks = Buffer.alloc(0);
				}
			}
		}
	}

	module.exports = Mangler;
})();
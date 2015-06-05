'use strict';

(function() {
	var _          = require('underscore')
	  , qtmrt      = require('./qtmrt')
	  , readUInt32 = require('./helpers').readUInt32
	;

	var Mangler = function()
	{
		this.chunks            = new Buffer(0);
		this.currentPacketSize = null;
	};

	Mangler.prototype = (function()
	{
		var read = function(chunk, callback)
		{
			var bytesRead = 0;

			// New packet.
			if (0 === this.chunks.length)
				this.currentPacketSize = readUInt32(chunk, 0);
			
			while (this.chunks.length < this.currentPacketSize && bytesRead < chunk.length) {
				var copySize = Math.min(this.currentPacketSize - this.chunks.length, chunk.length - bytesRead);
				this.chunks  = Buffer.concat([this.chunks, chunk.slice(bytesRead, bytesRead + copySize)]);
				bytesRead   += copySize;

				if (this.chunks.length === this.currentPacketSize)
				{
					callback.fun.call(callback.thisArg, this.chunks);
					
					if (bytesRead !== chunk.length)
						this.currentPacketSize = readUInt32(chunk.slice(bytesRead, bytesRead + qtmrt.UINT32_SIZE), 0);

					this.chunks = new Buffer(0);
				}
			}
		};

		return {
			read: read,
		};
	})();

	module.exports = Mangler;
})();

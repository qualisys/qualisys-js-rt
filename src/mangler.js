'use strict';

var qtmrt  = require('./qtmrt')
  , Packet = require('./packet')
;

var Mangler = function()
{
	this.chunks            = new Buffer(0);
	this.currentPacketSize = null;
};

Mangler.prototype = function()
{
	var read = function(chunk, callback)
	{
		var bytesRead = 0;

		// New packet.
		if (0 === this.chunks.length)
			this.currentPacketSize = Packet.getSize(chunk);
		
		while (this.chunks.length < this.currentPacketSize && bytesRead < chunk.length) {
			var copySize = Math.min(this.currentPacketSize, chunk.length - bytesRead);
			this.chunks  = Buffer.concat([this.chunks, chunk.slice(bytesRead, bytesRead + copySize)])
			bytesRead   += copySize;

			if (this.chunks.length === this.currentPacketSize)
			{
				callback.fun.call(callback.thisArg, this.chunks)
				
				if (bytesRead !== chunk.length)
					this.currentPacketSize = Packet.getSize(chunk.slice(bytesRead, bytesRead + qtmrt.UINT32_SIZE))

				this.chunks = new Buffer(0);
			}
		}
	};

	return {
		read: read,
	};
}();



module.exports = Mangler;

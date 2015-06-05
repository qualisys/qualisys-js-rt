'use strict';

(function() {
	var readUInt8  = require('./helpers').readUInt8
	  , readUInt16 = require('./helpers').readUInt16
	  , readUInt32 = require('./helpers').readUInt32
	  , readUInt64 = require('./helpers').readUInt64
	  , readFloat  = require('./helpers').readFloat
	  , Model      = require('./model')
	;

	var Muncher = Model.extend(
		{
			init: function(buf)
			{
				this.buffer  = buf;
				this.munched = 0;
			},
			
			munch: function(length)
			{
				if (!arguments.length)
					length = this.buffer.length - this.munched;

				var result = this.buffer.slice(this.munched, this.munched + length);
				this.munched += length;
				return result;
			},

			munchUInt8: function()
			{
				var result = readUInt8(this.buffer, this.munched);
				this.munched += 1;
				return isNaN(result) ? null : result;
			},

			munchUInt16: function()
			{
				var result = readUInt16(this.buffer, this.munched);
				this.munched += 2;
				return isNaN(result) ? null : result;
			},

			munchUInt32: function()
			{
				var result = readUInt32(this.buffer, this.munched);
				this.munched += 4;
				return isNaN(result) ? null : result;
			},

			munchUInt64: function()
			{
				var result = readUInt64(this.buffer, this.munched);
				this.munched += 8;
				return isNaN(result) ? null : result;
			},

			munchFloat: function()
			{
				var result = readFloat(this.buffer, this.munched);
				this.munched += 4;
				return isNaN(result) ? null : result;
			}
		}
	);

	module.exports = Muncher;
})();

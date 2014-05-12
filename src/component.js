'use strict';

var qtmrt      = require('./qtmrt')
  , readUInt32 = require('./helpers').readUInt32
  , readUInt16 = require('./helpers').readUInt16
  , readFloat  = require('./helpers').readFloat
  , Model      = require('./model')
;

var Component = Model.extend(
	{
		init: function(buf)
		{
			this.size = readUInt32(buf, 0);
			this.type = readUInt32(buf, qtmrt.UINT32_SIZE);
		},
	}
);

var Component3d = Model.extend(
	{
		init: function(buf)
		{
			this.buffer = buf;
			this.markerCount     = readUInt32(buf, qtmrt.COMPONENT_HEADER_SIZE);
			this.dropRate2d      = readUInt16(buf, qtmrt.COMPONENT_HEADER_SIZE + qtmrt.UINT32_SIZE);
			this.outOfSyncRate2d = readUInt16(buf, qtmrt.COMPONENT_HEADER_SIZE + qtmrt.UINT32_SIZE + qtmrt.UINT16_SIZE);
			this.markers         = [];

			this.parseMarkers();
		},

		parseMarkers: function()
		{
			for (var i = 0; i < this.markerCount; i++)
			{
				this.markers.push({
					x: readFloat(this.buffer, qtmrt.COMPONENT_MARKER_3D_OFFSET + (3 * qtmrt.FLOAT_SIZE * i) + 0 * qtmrt.FLOAT_SIZE),
					y: readFloat(this.buffer, qtmrt.COMPONENT_MARKER_3D_OFFSET + (3 * qtmrt.FLOAT_SIZE * i) + 1 * qtmrt.FLOAT_SIZE),
					z: readFloat(this.buffer, qtmrt.COMPONENT_MARKER_3D_OFFSET + (3 * qtmrt.FLOAT_SIZE * i) + 2 * qtmrt.FLOAT_SIZE),
				});
			}
		}
	},
	Component
);

var Component3dNoLabels = Model.extend(
	{
		parseMarkers: function()
		{
			for (var i = 0; i < this.markerCount; i++)
			{
				this.markers.push({
					x:  readFloat(this.buffer,  qtmrt.COMPONENT_MARKER_3D_OFFSET + (4 * qtmrt.FLOAT_SIZE * i) + 0 * qtmrt.FLOAT_SIZE),
					y:  readFloat(this.buffer,  qtmrt.COMPONENT_MARKER_3D_OFFSET + (4 * qtmrt.FLOAT_SIZE * i) + 1 * qtmrt.FLOAT_SIZE),
					z:  readFloat(this.buffer,  qtmrt.COMPONENT_MARKER_3D_OFFSET + (4 * qtmrt.FLOAT_SIZE * i) + 2 * qtmrt.FLOAT_SIZE),
					id: readUInt32(this.buffer, qtmrt.COMPONENT_MARKER_3D_OFFSET + (4 * qtmrt.FLOAT_SIZE * i) + 3 * qtmrt.FLOAT_SIZE),
				});
			}
		}
	},
	Component3d
);

Component.create = function(buf)
{
	var type = readUInt32(buf, qtmrt.UINT32_SIZE);

	switch (type) {
		
		case qtmrt.COMPONENT_3D:
			return new Component3d(buf);
		break;
		
		case qtmrt.COMPONENT_3D_NO_LABELS:
			return new Component3dNoLabels(buf);
		break;
		
		case qtmrt.COMPONENT_ANALOG:
		break;
		
		case qtmrt.COMPONENT_FORCE:
		break;
		
		case qtmrt.COMPONENT_6D:
		break;
		
		case qtmrt.COMPONENT_6D_Euler:
		break;
		
		case qtmrt.COMPONENT_2D:
		break;
		
		case qtmrt.COMPONENT_2D_LINEARIZED:
		break;
		
		case qtmrt.COMPONENT_3D_RESIDUALS:
		break;
		
		case qtmrt.COMPONENT_3D_NO_LABELS_RESIDUALS:
		break;
		
		case qtmrt.COMPONENT_6D_RESIDUALS:
		break;
		
		case qtmrt.COMPONENT_6D_EULER_RESIDUALS:
		break;
		
		case qtmrt.COMPONENT_ANALOG_SINGLE:
		break;
		
		case qtmrt.COMPONENT_IMAGE:
		break;

		case qtmrt.COMPONENT_FORCE_SINGLE:
		break;
	}
};

module.exports = Component;

'use strict';

var qtmrt      = require('./qtmrt')
  , readUInt32 = require('./helpers').readUInt32
  , readUInt16 = require('./helpers').readUInt16
  , readUInt8  = require('./helpers').readUInt8
  , readFloat  = require('./helpers').readFloat
  , Model      = require('./model')
;

var Camera = function() { };
Camera.create = function(buf)
{
	var camera         = {}
	  , bytesRead      = { count: 0 }
	;

	camera.markerCount = readUInt32(buf, 0, bytesRead);
	camera.statusFlags = readUInt8(buf, bytesRead.count, bytesRead);
	camera.markers     = [];

	for (var i = 0; i < camera.markerCount; i++)
	{
		camera.markers.push({
			x:          readUInt32(buf, bytesRead.count, bytesRead),
			y:          readUInt32(buf, bytesRead.count, bytesRead),
			diameterX:  readUInt16(buf, bytesRead.count, bytesRead),
			diameterY:  readUInt16(buf, bytesRead.count, bytesRead),
		});
	}

	return camera;
};

var Component = Model.extend(
	{
		init: function(buf)
		{
			this.size   = readUInt32(buf, 0);
			this.type   = readUInt32(buf, qtmrt.UINT32_SIZE);
			this.buffer = buf;
		},
	}
);

var Component2d = Model.extend(
	{
		init: function(buf)
		{
			Component.init.call(this, buf);
			this.cameraCount     = readUInt32(buf, qtmrt.COMPONENT_HEADER_SIZE);
			this.dropRate2d      = readUInt16(buf, qtmrt.COMPONENT_HEADER_SIZE + qtmrt.UINT32_SIZE);
			this.outOfSyncRate2d = readUInt16(buf, qtmrt.COMPONENT_HEADER_SIZE + qtmrt.UINT32_SIZE + qtmrt.UINT16_SIZE);
			this.cameras         = [];

			this.parseCameras();
		},

		parseCameras: function()
		{
			var markerOffset = 0;

			for (var i = 0; i < this.cameraCount; i++)
			{
				var cameraStart = qtmrt.COMPONENT_MARKER_2D_OFFSET + (i * (qtmrt.UINT32_SIZE + qtmrt.UINT8_SIZE)) + markerOffset;
				var markerCount = readUInt32(this.buffer, cameraStart);
				var cameraSize  = qtmrt.UINT32_SIZE + qtmrt.UINT8_SIZE + markerCount * qtmrt.COMPONENT_MARKER_2D_SIZE;

				markerOffset += markerCount * qtmrt.COMPONENT_MARKER_2D_SIZE;
				this.cameras.push(Camera.create(this.buffer.slice(cameraStart, cameraStart + cameraSize)));
			}
		}
	},
	Component
);

var Component3d = Model.extend(
	{
		init: function(buf)
		{
			Component.init.call(this, buf);
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
		case qtmrt.COMPONENT_2D_LINEARIZED:
			new Component2d(buf);
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

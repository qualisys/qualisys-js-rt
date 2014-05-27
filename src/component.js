'use strict';

var qtmrt      = require('./qtmrt')
  , readUInt32 = require('./mangler').readUInt32
  , readUInt16 = require('./mangler').readUInt16
  , readUInt8  = require('./mangler').readUInt8
  , readFloat  = require('./mangler').readFloat
  , Model      = require('./model')
;

var Camera = function() { };
Camera.create = function(buf)
{
	var camera    = {}
	  , bytesRead = { count: 0 }
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

var RotationMatrix = function() { };
RotationMatrix.create = function(buf)
{
	var matrix       = []
	  , bytesRead    = { count: 0 }
	  , matrixLength = 9;
	;

	for (var i = 0; i < matrixLength; i++)
		matrix.push(readFloat(buf, bytesRead.count, bytesRead));

	return matrix;
};

var componentTypeToString = function(typeId)
{
	var typeNames = {};
	typeNames[qtmrt.COMPONENT_2D]                     = '2D';
	typeNames[qtmrt.COMPONENT_2D_LINEARIZED]          = '2D (linearized)';
	typeNames[qtmrt.COMPONENT_3D]                     = '3D';
	typeNames[qtmrt.COMPONENT_3D_NO_LABELS]           = '3D (no labels)';
	typeNames[qtmrt.COMPONENT_3D_RESIDUALS]           = '3D (with residuals)';
	typeNames[qtmrt.COMPONENT_3D_NO_LABELS_RESIDUALS] = '3D (no labels, with residuals)';
	typeNames[qtmrt.COMPONENT_6D]                     = '6DOF';
	typeNames[qtmrt.COMPONENT_6D_EULER]               = '6DOF (with euler angles)';
	typeNames[qtmrt.COMPONENT_6D_RESIDUALS]           = '6DOF (with residuals)';
	typeNames[qtmrt.COMPONENT_6D_EULER_RESIDUALS]     = '6DOF (with eauler angles and residuals)';
	typeNames[qtmrt.COMPONENT_IMAGE]                  = 'Image';
	typeNames[qtmrt.COMPONENT_ANALOG]                 = 'Analog';
	typeNames[qtmrt.COMPONENT_ANALOG_SINGLE]          = 'Analog (single sample)';
	typeNames[qtmrt.COMPONENT_FORCE]                  = 'Force';
	typeNames[qtmrt.COMPONENT_FORCE_SINGLE]           = 'Force (single sample)';
	return typeNames[typeId];
};

var componentTypeToCommandString = function(typeId)
{
	var typeNames = {};
	typeNames[qtmrt.COMPONENT_2D]                     = '2D';
	typeNames[qtmrt.COMPONENT_2D_LINEARIZED]          = '2DLin';
	typeNames[qtmrt.COMPONENT_3D]                     = '3D';
	typeNames[qtmrt.COMPONENT_3D_NO_LABELS]           = '3DNoLabels';
	typeNames[qtmrt.COMPONENT_3D_RESIDUALS]           = '3DRes)';
	typeNames[qtmrt.COMPONENT_3D_NO_LABELS_RESIDUALS] = '3DNoLabelsRes)';
	typeNames[qtmrt.COMPONENT_6D]                     = '6D';
	typeNames[qtmrt.COMPONENT_6D_EULER]               = '6DEuler';
	typeNames[qtmrt.COMPONENT_6D_RESIDUALS]           = '6DRes';
	typeNames[qtmrt.COMPONENT_6D_EULER_RESIDUALS]     = '6DEulerRes';
	typeNames[qtmrt.COMPONENT_IMAGE]                  = 'Image';
	typeNames[qtmrt.COMPONENT_ANALOG]                 = 'Analog';
	typeNames[qtmrt.COMPONENT_ANALOG_SINGLE]          = 'AnalogSingle';
	typeNames[qtmrt.COMPONENT_FORCE]                  = 'Force';
	typeNames[qtmrt.COMPONENT_FORCE_SINGLE]           = 'ForceSingle';
	return typeNames[typeId];
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
				var cameraStart = qtmrt.COMPONENT_2D_OFFSET + (i * (qtmrt.UINT32_SIZE + qtmrt.UINT8_SIZE)) + markerOffset;
				var markerCount = readUInt32(this.buffer, cameraStart);
				var cameraSize  = qtmrt.UINT32_SIZE + qtmrt.UINT8_SIZE + markerCount * qtmrt.COMPONENT_2D_SIZE;

				markerOffset += markerCount * qtmrt.COMPONENT_2D_SIZE;
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
					x: readFloat(this.buffer, qtmrt.COMPONENT_3D_OFFSET + (3 * qtmrt.FLOAT_SIZE * i) + 0 * qtmrt.FLOAT_SIZE),
					y: readFloat(this.buffer, qtmrt.COMPONENT_3D_OFFSET + (3 * qtmrt.FLOAT_SIZE * i) + 1 * qtmrt.FLOAT_SIZE),
					z: readFloat(this.buffer, qtmrt.COMPONENT_3D_OFFSET + (3 * qtmrt.FLOAT_SIZE * i) + 2 * qtmrt.FLOAT_SIZE),
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
					x:  readFloat(this.buffer,  qtmrt.COMPONENT_3D_OFFSET + (4 * qtmrt.FLOAT_SIZE * i) + 0 * qtmrt.FLOAT_SIZE),
					y:  readFloat(this.buffer,  qtmrt.COMPONENT_3D_OFFSET + (4 * qtmrt.FLOAT_SIZE * i) + 1 * qtmrt.FLOAT_SIZE),
					z:  readFloat(this.buffer,  qtmrt.COMPONENT_3D_OFFSET + (4 * qtmrt.FLOAT_SIZE * i) + 2 * qtmrt.FLOAT_SIZE),
					id: readUInt32(this.buffer, qtmrt.COMPONENT_3D_OFFSET + (4 * qtmrt.FLOAT_SIZE * i) + 3 * qtmrt.FLOAT_SIZE),
				});
			}
		}
	},
	Component3d
);

var Component3dResiduals = Model.extend(
	{
		parseMarkers: function()
		{
			for (var i = 0; i < this.markerCount; i++)
			{
				this.markers.push({
					x:        readFloat(this.buffer, qtmrt.COMPONENT_3D_OFFSET + (4 * qtmrt.FLOAT_SIZE * i) + 0 * qtmrt.FLOAT_SIZE),
					y:        readFloat(this.buffer, qtmrt.COMPONENT_3D_OFFSET + (4 * qtmrt.FLOAT_SIZE * i) + 1 * qtmrt.FLOAT_SIZE),
					z:        readFloat(this.buffer, qtmrt.COMPONENT_3D_OFFSET + (4 * qtmrt.FLOAT_SIZE * i) + 2 * qtmrt.FLOAT_SIZE),
					residual: readFloat(this.buffer, qtmrt.COMPONENT_3D_OFFSET + (4 * qtmrt.FLOAT_SIZE * i) + 3 * qtmrt.FLOAT_SIZE),
				});
			}
		}
	},
	Component3d
);

var Component3dNoLabelsResiduals = Model.extend(
	{
		parseMarkers: function()
		{
			for (var i = 0; i < this.markerCount; i++)
			{
				this.markers.push({
					x:        readFloat(this.buffer,  qtmrt.COMPONENT_3D_OFFSET + (5 * qtmrt.FLOAT_SIZE * i) + 0 * qtmrt.FLOAT_SIZE),
					y:        readFloat(this.buffer,  qtmrt.COMPONENT_3D_OFFSET + (5 * qtmrt.FLOAT_SIZE * i) + 1 * qtmrt.FLOAT_SIZE),
					z:        readFloat(this.buffer,  qtmrt.COMPONENT_3D_OFFSET + (5 * qtmrt.FLOAT_SIZE * i) + 2 * qtmrt.FLOAT_SIZE),
					id:       readUInt32(this.buffer, qtmrt.COMPONENT_3D_OFFSET + (5 * qtmrt.FLOAT_SIZE * i) + 3 * qtmrt.FLOAT_SIZE),
					residual: readFloat(this.buffer,  qtmrt.COMPONENT_3D_OFFSET + (5 * qtmrt.FLOAT_SIZE * i) + 4 * qtmrt.UINT32_SIZE),
				});
			}
		}
	},
	Component3d
);

var Component6d = Model.extend(
	{
		init: function(buf) {
			Component.init.call(this, buf);
			this.rigidBodyCount  = readUInt32(buf, qtmrt.COMPONENT_HEADER_SIZE);
			this.dropRate2d      = readUInt16(buf, qtmrt.COMPONENT_HEADER_SIZE + qtmrt.UINT32_SIZE);
			this.outOfSyncRate2d = readUInt16(buf, qtmrt.COMPONENT_HEADER_SIZE + qtmrt.UINT32_SIZE + qtmrt.UINT16_SIZE);
			this.rigidBodies     = [];

			this.parseRigidBodies();
		},

		parseRigidBodies: function()
		{
			for (var i = 0; i < this.rigidBodyCount; i++)
			{
				var rotationStart = qtmrt.COMPONENT_6D_OFFSET + (12 * qtmrt.FLOAT_SIZE * i) + 3 * qtmrt.FLOAT_SIZE
				  , rotationEnd   = rotationStart + 9 * qtmrt.FLOAT_SIZE
				;

				this.rigidBodies.push({
					x:        readFloat(this.buffer, qtmrt.COMPONENT_6D_OFFSET + (12 * qtmrt.FLOAT_SIZE * i) + 0 * qtmrt.FLOAT_SIZE),
					y:        readFloat(this.buffer, qtmrt.COMPONENT_6D_OFFSET + (12 * qtmrt.FLOAT_SIZE * i) + 1 * qtmrt.FLOAT_SIZE),
					z:        readFloat(this.buffer, qtmrt.COMPONENT_6D_OFFSET + (12 * qtmrt.FLOAT_SIZE * i) + 2 * qtmrt.FLOAT_SIZE),
					rotation: RotationMatrix.create(this.buffer.slice(rotationStart, rotationEnd)),
				});
			}
		}

	},
	Component
);

var Component6dResiduals = Model.extend(
	{
		parseRigidBodies: function()
		{
			for (var i = 0; i < this.rigidBodyCount; i++)
			{
				var rotationStart = qtmrt.COMPONENT_6D_OFFSET + (13 * qtmrt.FLOAT_SIZE * i) + 3 * qtmrt.FLOAT_SIZE
				  , rotationEnd   = rotationStart + 9 * qtmrt.FLOAT_SIZE
				;

				this.rigidBodies.push({
					x:        readFloat(this.buffer, qtmrt.COMPONENT_6D_OFFSET + (13 * qtmrt.FLOAT_SIZE * i) + 0  * qtmrt.FLOAT_SIZE),
					y:        readFloat(this.buffer, qtmrt.COMPONENT_6D_OFFSET + (13 * qtmrt.FLOAT_SIZE * i) + 1  * qtmrt.FLOAT_SIZE),
					z:        readFloat(this.buffer, qtmrt.COMPONENT_6D_OFFSET + (13 * qtmrt.FLOAT_SIZE * i) + 2  * qtmrt.FLOAT_SIZE),
					rotation: RotationMatrix.create(this.buffer.slice(rotationStart, rotationEnd)),
					residual: readFloat(this.buffer, qtmrt.COMPONENT_6D_OFFSET + (13 * qtmrt.FLOAT_SIZE * i) + 12 * qtmrt.FLOAT_SIZE),
				});
			}
		}

	},
	Component6d
);

var Component6dEuler = Model.extend(
	{
		parseRigidBodies: function()
		{
			for (var i = 0; i < this.rigidBodyCount; i++)
			{
				var rotationStart = qtmrt.COMPONENT_6D_OFFSET + (13 * qtmrt.FLOAT_SIZE * i) + 3 * qtmrt.FLOAT_SIZE
				  , rotationEnd   = rotationStart + 9 * qtmrt.FLOAT_SIZE
				;

				this.rigidBodies.push({
					x:        readFloat(this.buffer, qtmrt.COMPONENT_6D_OFFSET + (6 * qtmrt.FLOAT_SIZE * i) + 0 * qtmrt.FLOAT_SIZE),
					y:        readFloat(this.buffer, qtmrt.COMPONENT_6D_OFFSET + (6 * qtmrt.FLOAT_SIZE * i) + 1 * qtmrt.FLOAT_SIZE),
					z:        readFloat(this.buffer, qtmrt.COMPONENT_6D_OFFSET + (6 * qtmrt.FLOAT_SIZE * i) + 2 * qtmrt.FLOAT_SIZE),
					euler1:   readFloat(this.buffer, qtmrt.COMPONENT_6D_OFFSET + (6 * qtmrt.FLOAT_SIZE * i) + 3 * qtmrt.FLOAT_SIZE),
					euler2:   readFloat(this.buffer, qtmrt.COMPONENT_6D_OFFSET + (6 * qtmrt.FLOAT_SIZE * i) + 4 * qtmrt.FLOAT_SIZE),
					euler3:   readFloat(this.buffer, qtmrt.COMPONENT_6D_OFFSET + (6 * qtmrt.FLOAT_SIZE * i) + 5 * qtmrt.FLOAT_SIZE),
				});
			}
		}

	},
	Component6d
);

var Component6dEulerResiduals = Model.extend(
	{
		parseRigidBodies: function()
		{
			for (var i = 0; i < this.rigidBodyCount; i++)
			{
				var rotationStart = qtmrt.COMPONENT_6D_OFFSET + (13 * qtmrt.FLOAT_SIZE * i) + 3 * qtmrt.FLOAT_SIZE
				  , rotationEnd   = rotationStart + 9 * qtmrt.FLOAT_SIZE
				;

				this.rigidBodies.push({
					x:         readFloat(this.buffer, qtmrt.COMPONENT_6D_OFFSET + (7 * qtmrt.FLOAT_SIZE * i) + 0 * qtmrt.FLOAT_SIZE),
					y:         readFloat(this.buffer, qtmrt.COMPONENT_6D_OFFSET + (7 * qtmrt.FLOAT_SIZE * i) + 1 * qtmrt.FLOAT_SIZE),
					z:         readFloat(this.buffer, qtmrt.COMPONENT_6D_OFFSET + (7 * qtmrt.FLOAT_SIZE * i) + 2 * qtmrt.FLOAT_SIZE),
					euler1:    readFloat(this.buffer, qtmrt.COMPONENT_6D_OFFSET + (7 * qtmrt.FLOAT_SIZE * i) + 3 * qtmrt.FLOAT_SIZE),
					euler2:    readFloat(this.buffer, qtmrt.COMPONENT_6D_OFFSET + (7 * qtmrt.FLOAT_SIZE * i) + 4 * qtmrt.FLOAT_SIZE),
					euler3:    readFloat(this.buffer, qtmrt.COMPONENT_6D_OFFSET + (7 * qtmrt.FLOAT_SIZE * i) + 5 * qtmrt.FLOAT_SIZE),
					residuals: readFloat(this.buffer, qtmrt.COMPONENT_6D_OFFSET + (7 * qtmrt.FLOAT_SIZE * i) + 6 * qtmrt.FLOAT_SIZE),
				});
			}
		}

	},
	Component6d
);

Component.create = function(buf)
{
	var type = readUInt32(buf, qtmrt.UINT32_SIZE);

	switch (type) {
		case qtmrt.COMPONENT_2D:
		case qtmrt.COMPONENT_2D_LINEARIZED:
			return new Component2d(buf);
		break;
		
		case qtmrt.COMPONENT_3D:
			return new Component3d(buf);
		break;
		
		case qtmrt.COMPONENT_3D_NO_LABELS:
			return new Component3dNoLabels(buf);
		break;
		
		case qtmrt.COMPONENT_3D_RESIDUALS:
			return new Component3dResiduals(buf);
		break;
		
		case qtmrt.COMPONENT_3D_NO_LABELS_RESIDUALS:
			return new Component3dNoLabelsResiduals(buf);
		break;
		
		case qtmrt.COMPONENT_6D:
			return new Component6d(buf);
		break;
		
		case qtmrt.COMPONENT_6D_EULER:
			return new Component6dEuler(buf);
		break;
		
		case qtmrt.COMPONENT_6D_RESIDUALS:
			return new Component6dResiduals(buf);
		break;
		
		case qtmrt.COMPONENT_6D_EULER_RESIDUALS:
			return new Component6dEulerResiduals(buf);
		break;

		case qtmrt.COMPONENT_ANALOG:
		break;
		
		case qtmrt.COMPONENT_ANALOG_SINGLE:
		break;
		
		case qtmrt.COMPONENT_FORCE:
		break;
		
		case qtmrt.COMPONENT_FORCE_SINGLE:
		break;

		case qtmrt.COMPONENT_IMAGE:
		break;
	}
};

Component.typeToString = componentTypeToString;
Component.typeToCommandString = componentTypeToCommandString;

module.exports = Component;


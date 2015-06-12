'use strict';

(function() {
	var qtmrt      = require('./qtmrt')
	  , readUInt32 = require('./helpers').readUInt32
	  , Model      = require('./model')
	  , Muncher    = require('./muncher')
	;

	var componentTypeToString = function(typeId)
	{
		for (var compStr in qtmrt.COMPONENTS) {

			if (Number(typeId) === qtmrt.COMPONENTS[compStr])
				return compStr;
		}

		if (typeId === qtmrt.COMPONENT_ALL)
			return 'All';

		throw new Error('Unknown component: ' + typeId + '.'); 
	};

	var componentTypeToPrettyString = function(typeId)
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
		typeNames[qtmrt.COMPONENT_GAZE_VECTOR]            = 'Gaze vector';
		return typeNames[typeId];
	};

	var componentStringToType = function(compStr)
	{
		if (!qtmrt.COMPONENTS[compStr]) throw new Error('Unknown component string');
		return qtmrt.COMPONENTS[compStr];
	};

	var Component = Model.extend(
		{
			init: function(buf)
			{
				if (!arguments.length)
					throw new TypeError('No buffer specified');

				Muncher.init.call(this, buf);
				this.size = this.munchUInt32();
				this.type = this.munchUInt32();
			},
		}, Muncher
	);

	var Component2d = Model.extend(
		{
			init: function(buf)
			{
				Component.init.call(this, buf);
				this.cameraCount     = this.munchUInt32();
				this.dropRate2d      = this.munchUInt16();
				this.outOfSyncRate2d = this.munchUInt16();
				this.cameras         = [];

				this.parseCameras();
			},

			parseCameras: function()
			{
				var markerOffset = 0;

				for (var i = 0; i < this.cameraCount; i++)
				{
					var camera = {
						markerCount: this.munchUInt32(),
						statusFlags: this.munchUInt8(),
						markers: [],
					};

					for (var j = 0; j < camera.markerCount; j++)
					{
						camera.markers.push({
							x:          this.munchUInt32(),
							y:          this.munchUInt32(),
							diameterX:  this.munchUInt16(),
							diameterY:  this.munchUInt16(),
						});
					}
					this.cameras.push(camera);
				}
			},

			toJson: function() {
				return {
					cameraCount: this.cameraCount,
					dropRate2d: this.dropRate2d,
					outOfSyncRate2d: this.outOfSyncRate2d,
					cameras: this.cameras,
				};
			},
		},
		Component
	);

	var Component3d = Model.extend(
		{
			init: function(buf)
			{
				Component.init.call(this, buf);
				this.markerCount     = this.munchUInt32();
				this.dropRate2d      = this.munchUInt16();
				this.outOfSyncRate2d = this.munchUInt16();
				this.markers         = [];

				this.parseMarkers();
			},

			parseMarkers: function()
			{
				for (var i = 0; i < this.markerCount; i++)
				{
					this.markers.push({
						x: this.munchFloat(),
						y: this.munchFloat(),
						z: this.munchFloat(),
					});
				}
			},

			toJson: function() {
				return {
					markerCount: this.markerCount,
					dropRate2d: this.dropRate2d,
					outOfSyncRate2d: this.outOfSyncRate2d,
					markers: this.markers,
				};
			},
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
						x:  this.munchFloat(),
						y:  this.munchFloat(),
						z:  this.munchFloat(),
						id:  this.munchUInt32(),
					});
				}
			},
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
						x:  this.munchFloat(),
						y:  this.munchFloat(),
						z:  this.munchFloat(),
						residual: this.munchFloat(),
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
						x:  this.munchFloat(),
						y:  this.munchFloat(),
						z:  this.munchFloat(),
						id: this.munchUInt32(),
						residual: this.munchFloat(),
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
				this.rigidBodyCount  = this.munchUInt32();
				this.dropRate2d      = this.munchUInt16();
				this.outOfSyncRate2d = this.munchUInt16();
				this.rigidBodies     = [];

				this.parseRigidBodies();
			},

			parseRigidBodies: function()
			{
				for (var i = 0; i < this.rigidBodyCount; i++)
				{
					var rigidBody = {
						x:        this.munchFloat(),
						y:        this.munchFloat(),
						z:        this.munchFloat(),
						rotation: [],
					};

					for (var j = 0; j < 9; j++)
						rigidBody.rotation.push(this.munchFloat());

					this.rigidBodies.push(rigidBody);
				}
			},

			toJson: function() {
				return {
					rigidBodyCount: this.rigidBodyCount,
					dropRate2d: this.dropRate2d,
					outOfSyncRate2d: this.outOfSyncRate2d,
					rigidBodies: this.rigidBodies,
				};
			},

		},
		Component
	);

	var Component6dResiduals = Model.extend(
		{
			parseRigidBodies: function()
			{
				for (var i = 0; i < this.rigidBodyCount; i++)
				{
					var rigidBody = {
						x:        this.munchFloat(),
						y:        this.munchFloat(),
						z:        this.munchFloat(),
						rotation: [],
						residual: null,
					};

					for (var j = 0; j < 9; j++)
						rigidBody.rotation.push(this.munchFloat());

					rigidBody.residual = this.munchFloat();

					this.rigidBodies.push(rigidBody);
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
					this.rigidBodies.push({
						x:        this.munchFloat(),
						y:        this.munchFloat(),
						z:        this.munchFloat(),
						euler1:   this.munchFloat(),
						euler2:   this.munchFloat(),
						euler3:   this.munchFloat(),
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
					this.rigidBodies.push({
						x:          this.munchFloat(),
						y:          this.munchFloat(),
						z:          this.munchFloat(),
						euler1:     this.munchFloat(),
						euler2:     this.munchFloat(),
						euler3:     this.munchFloat(),
						residuals:  this.munchFloat(),
					});
				}
			}

		},
		Component6d
	);

	var ComponentAnalog = Model.extend(
		{
			init: function(buf) {
				Component.init.call(this, buf);
				this.deviceCount = this.munchUInt32();
				this.devices     = [];

				this.parseDevices();
			},

			parseDevices: function()
			{
				for (var i = 0; i < this.deviceCount; i++)
				{
					var device = {
						id:            this.munchUInt32(),
						channelCount:  this.munchUInt32(),
						sampleCount:   this.munchUInt32(),
						sampleNumber:  this.munchUInt32(),
						data:          [],
					};

					for (var j = 0; j < device.channelCount; j++)
					{
						var channel = [];
						for (var k = 0; k < device.sampleCount; k++)
							channel.push(this.munchFloat());
						device.data.push(channel);
					}
					this.devices.push(device);
				}
			},

			toJson: function() {
				return {
					deviceCount: this.deviceCount,
					devices: this.devices,
				};
			},

		},
		Component
	);

	var ComponentAnalogSingle = Model.extend(
		{
			parseDevices: function()
			{
				for (var i = 0; i < this.deviceCount; i++)
				{
					var device = {
						id:            this.munchUInt32(),
						channelCount:  this.munchUInt32(),
						data:          [],
					};

					for (var j = 0; j < device.channelCount; j++)
						device.data.push([this.munchFloat()]);

					this.devices.push(device);
				}
			}

		},
		ComponentAnalog
	);

	var ComponentForce = Model.extend(
		{
			init: function(buf) {
				Component.init.call(this, buf);
				
				// XXX: Not quite sure about this, but sometimes QTM sends empty
				// force components. 
				if (12 === this.size)
					this.plateCount = 0;
				else
					this.plateCount = this.munchUInt32();

				this.plates = [];

				this.parsePlates();
			},

			parsePlates: function()
			{
				for (var i = 0; i < this.plateCount; i++)
				{
					var plate = {
						id:           this.munchUInt32(),
						forceCount:   this.munchUInt32(),
						forceNumber:  this.munchUInt32(),
						data:         [],
					};

					for (var j = 0; j < plate.forceCount; j++)
						plate.data.push({
							forceX: this.munchFloat(),
							forceY: this.munchFloat(),
							forceZ: this.munchFloat(),
							momentX: this.munchFloat(),
							momentY: this.munchFloat(),
							momentZ: this.munchFloat(),
							posX: this.munchFloat(),
							posY: this.munchFloat(),
							posZ: this.munchFloat(),
						});

					this.plates.push(plate);
				}
			},

			toJson: function() {
				return {
					plateCount: this.plateCount,
					plates: this.plates,
				};
			},

		},
		Component
	);

	var ComponentForceSingle = Model.extend(
		{
			parsePlates: function()
			{
				for (var i = 0; i < this.plateCount; i++)
				{
					var plate = {
						id:    this.munchUInt32(),
						data:  [{
							forceX: this.munchFloat(),
							forceY: this.munchFloat(),
							forceZ: this.munchFloat(),
							momentX: this.munchFloat(),
							momentY: this.munchFloat(),
							momentZ: this.munchFloat(),
							posX: this.munchFloat(),
							posY: this.munchFloat(),
							posZ: this.munchFloat(),
						}],
					};

					this.plates.push(plate);
				}
			}

		},
		ComponentForce
	);

	var ComponentImage = Model.extend(
		{
			init: function(buf) {
				Component.init.call(this, buf);
				this.cameraCount = this.munchUInt32();
				this.cameras     = [];

				this.parseCameras();
			},

			parseCameras: function()
			{
				for (var i = 0; i < this.cameraCount; i++)
				{
					var camera = {
						id:           this.munchUInt32(),
						imageFormat:  this.munchUInt32(),
						width:        this.munchUInt32(),
						height:       this.munchUInt32(),
						leftCrop:     this.munchFloat(),
						topCrop:      this.munchFloat(),
						rightCrop:    this.munchFloat(),
						bottomCrop:   this.munchFloat(),
						imageSize:    this.munchUInt(),
						data:         null,
					};
					
					camera.data = this.munch(camera.imageSize);

					this.cameras.push(camera);
				}
			},

			toJson: function() {
				return {
					cameraCount: this.cameraCount,
					cameras: this.plates,
				};
			},

		},
		Component
	);

	var ComponentGazeVector = Model.extend(
		{
			init: function(buf)
			{
				Component.init.call(this, buf);
				this.gazeVectorCount = this.munchUInt32();
				this.gazeVectors     = [];

				this.parseGazeVectors();
			},

			parseGazeVectors: function()
			{
				for (var i = 0; i < this.gazeVectorCount; i++)
				{
					var gazeVector   = {
						sampleCount: this.munchUInt32(),
						samples: [],
					};

					gazeVector.sampleNumber = (0 < gazeVector.sampleCount) ? this.munchUInt32() : 0;

					for (var j = 0; j < gazeVector.sampleCount; j++)
					{
						gazeVector.samples.push({
							vectorX: this.munchFloat(),
							vectorY: this.munchFloat(),
							vectorZ: this.munchFloat(),
							positionX: this.munchFloat(),
							positionY: this.munchFloat(),
							positionZ: this.munchFloat(),
						});
					}

					this.gazeVectors.push(gazeVector);
				}
			},

			toJson: function() {
				return {
					gazeVectors: this.gazeVectors
				};
			},
		},
		Component
	);

	Component.create = function(buf)
	{
		var type = readUInt32(buf, qtmrt.UINT32_SIZE);

		switch (type) {
			case qtmrt.COMPONENT_2D:
			case qtmrt.COMPONENT_2D_LINEARIZED:
				return new Component2d(buf);
			
			case qtmrt.COMPONENT_3D:
				return new Component3d(buf);
			
			case qtmrt.COMPONENT_3D_NO_LABELS:
				return new Component3dNoLabels(buf);
			
			case qtmrt.COMPONENT_3D_RESIDUALS:
				return new Component3dResiduals(buf);
			
			case qtmrt.COMPONENT_3D_NO_LABELS_RESIDUALS:
				return new Component3dNoLabelsResiduals(buf);
			
			case qtmrt.COMPONENT_6D:
				return new Component6d(buf);
			
			case qtmrt.COMPONENT_6D_EULER:
				return new Component6dEuler(buf);
			
			case qtmrt.COMPONENT_6D_RESIDUALS:
				return new Component6dResiduals(buf);
			
			case qtmrt.COMPONENT_6D_EULER_RESIDUALS:
				return new Component6dEulerResiduals(buf);

			case qtmrt.COMPONENT_ANALOG:
				return new ComponentAnalog(buf);
			
			case qtmrt.COMPONENT_ANALOG_SINGLE:
				return new ComponentAnalogSingle(buf);
			
			case qtmrt.COMPONENT_FORCE:
				return new ComponentForce(buf);
			
			case qtmrt.COMPONENT_FORCE_SINGLE:
				return new ComponentForceSingle(buf);

			case qtmrt.COMPONENT_IMAGE:
				return new ComponentImage(buf);

			case qtmrt.COMPONENT_GAZE_VECTOR:
				return new ComponentGazeVector(buf);
		}
	};

	Component.typeToString       = componentTypeToString;
	Component.typeToPrettyString = componentTypeToPrettyString;
	Component.stringToType       = componentStringToType;

	module.exports = Component;
})();

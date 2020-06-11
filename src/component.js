'use strict';

(function() {
	var qtmrt      = require('./qtmrt')
	  , Muncher    = require('./muncher')
	  , readUInt32 = require('./buffer-io').readUInt32
	;

	class Component extends Muncher {
		constructor(buf, byteOrder) {
			if (!arguments.length)
				throw new TypeError('No buffer specified');

			super(buf, byteOrder);

			this.size = this.munchUInt32();
			this.type = this.munchUInt32();
		}

		static create(buf, byteOrder) {
			var type = readUInt32(buf, qtmrt.UINT32_SIZE, null, byteOrder);

			switch (type) {
				case qtmrt.COMPONENT_2D:
				case qtmrt.COMPONENT_2D_LINEARIZED:
					return new Component2d(buf, byteOrder);

				case qtmrt.COMPONENT_3D:
					return new Component3d(buf, byteOrder);

				case qtmrt.COMPONENT_3D_NO_LABELS:
					return new Component3dNoLabels(buf, byteOrder);

				case qtmrt.COMPONENT_3D_RESIDUALS:
					return new Component3dResiduals(buf, byteOrder);

				case qtmrt.COMPONENT_3D_NO_LABELS_RESIDUALS:
					return new Component3dNoLabelsResiduals(buf, byteOrder);

				case qtmrt.COMPONENT_6D:
					return new Component6d(buf, byteOrder);

				case qtmrt.COMPONENT_6D_EULER:
					return new Component6dEuler(buf, byteOrder);

				case qtmrt.COMPONENT_6D_RESIDUALS:
					return new Component6dResiduals(buf, byteOrder);

				case qtmrt.COMPONENT_6D_EULER_RESIDUALS:
					return new Component6dEulerResiduals(buf, byteOrder);

				case qtmrt.COMPONENT_ANALOG:
					return new ComponentAnalog(buf, byteOrder);

				case qtmrt.COMPONENT_ANALOG_SINGLE:
					return new ComponentAnalogSingle(buf, byteOrder);

				case qtmrt.COMPONENT_FORCE:
					return new ComponentForce(buf, byteOrder);

				case qtmrt.COMPONENT_FORCE_SINGLE:
					return new ComponentForceSingle(buf, byteOrder);

				case qtmrt.COMPONENT_IMAGE:
					return new ComponentImage(buf, byteOrder);

				case qtmrt.COMPONENT_GAZE_VECTOR:
					return new ComponentGazeVector(buf, byteOrder);

				case qtmrt.COMPONENT_TIMECODE:
					return new ComponentTimecode(buf, byteOrder);

				case qtmrt.COMPONENT_SKELETON:
					return new ComponentSkeleton(buf, byteOrder);

				case qtmrt.COMPONENT_EYE_TRACKER:
					return new ComponentEyeTracker(buf, byteOrder);
			}
		}

		static typeToString(typeId) {
			for (var compStr in qtmrt.COMPONENTS) {
				if (Number(typeId) === qtmrt.COMPONENTS[compStr])
					return compStr;
			}

			if (typeId === qtmrt.COMPONENT_ALL)
				return 'All';

			throw new Error('Unknown component: ' + typeId + '.');
		}

		static stringToType(compStr) {
			if (!qtmrt.COMPONENTS[compStr]) throw new Error('Unknown component string');
			return qtmrt.COMPONENTS[compStr];
		}

		static typeToPrettyString(typeId) {
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
			typeNames[qtmrt.COMPONENT_TIMECODE]               = 'Timecode';
			typeNames[qtmrt.COMPONENT_SKELETON]               = 'Skeleton';

			return typeNames[typeId];
		}
	}

	class Component2d extends Component {
		constructor(buf, byteOrder) {
			super(buf, byteOrder);

			this.cameraCount     = this.munchUInt32();
			this.dropRate2d      = this.munchUInt16();
			this.outOfSyncRate2d = this.munchUInt16();
			this.cameras         = [];

			this.parseCameras();
		}

		parseCameras() {
			for (var i = 0; i < this.cameraCount; i++) {
				var camera = {
					markerCount: this.munchUInt32(),
					statusFlags: this.munchUInt8(),
					markers: [],
				};

				for (var j = 0; j < camera.markerCount; j++) {
					camera.markers.push({
						x:          this.munchUInt32(),
						y:          this.munchUInt32(),
						diameterX:  this.munchUInt16(),
						diameterY:  this.munchUInt16(),
					});
				}
				this.cameras.push(camera);
			}
		}

		toJson() {
			return {
				cameraCount: this.cameraCount,
				dropRate2d: this.dropRate2d,
				outOfSyncRate2d: this.outOfSyncRate2d,
				cameras: this.cameras,
			};
		}
	}

	class Component3d extends Component {
		constructor(buf, byteOrder) {
			super(buf, byteOrder);

			this.markerCount     = this.munchUInt32();
			this.dropRate2d      = this.munchUInt16();
			this.outOfSyncRate2d = this.munchUInt16();
			this.markers         = [];

			this.parseMarkers();
		}

		parseMarkers() {
			for (var i = 0; i < this.markerCount; i++) {
				this.markers.push({
					x: this.munchFloat(),
					y: this.munchFloat(),
					z: this.munchFloat(),
				});
			}
		}

		toJson() {
			return {
				markerCount: this.markerCount,
				dropRate2d: this.dropRate2d,
				outOfSyncRate2d: this.outOfSyncRate2d,
				markers: this.markers,
			};
		}
	}

	class Component3dNoLabels extends Component3d {
		parseMarkers() {
			for (var i = 0; i < this.markerCount; i++) {
				this.markers.push({
					x:  this.munchFloat(),
					y:  this.munchFloat(),
					z:  this.munchFloat(),
					id:  this.munchUInt32(),
				});
			}
		}
	}

	class Component3dResiduals extends Component3d {
		parseMarkers() {
			for (var i = 0; i < this.markerCount; i++) {
				this.markers.push({
					x:  this.munchFloat(),
					y:  this.munchFloat(),
					z:  this.munchFloat(),
					residual: this.munchFloat(),
				});
			}
		}
	}

	class Component3dNoLabelsResiduals extends Component3d {
		parseMarkers() {
			for (var i = 0; i < this.markerCount; i++) {
				this.markers.push({
					x:  this.munchFloat(),
					y:  this.munchFloat(),
					z:  this.munchFloat(),
					id: this.munchUInt32(),
					residual: this.munchFloat(),
				});
			}
		}
	}

	class Component6d extends Component {
		constructor(buf, byteOrder) {
			super(buf, byteOrder);

			this.rigidBodyCount  = this.munchUInt32();
			this.dropRate2d      = this.munchUInt16();
			this.outOfSyncRate2d = this.munchUInt16();
			this.rigidBodies     = [];

			this.parseRigidBodies();
		}

		parseRigidBodies() {
			for (var i = 0; i < this.rigidBodyCount; i++) {
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
		}

		toJson() {
			return {
				rigidBodyCount: this.rigidBodyCount,
				dropRate2d: this.dropRate2d,
				outOfSyncRate2d: this.outOfSyncRate2d,
				rigidBodies: this.rigidBodies,
			};
		}
	}

	class Component6dResiduals extends Component6d {
		parseRigidBodies() {
			for (var i = 0; i < this.rigidBodyCount; i++) {
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
	}

	class Component6dEuler extends Component6d {
		parseRigidBodies() {
			for (var i = 0; i < this.rigidBodyCount; i++) {
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
	}

	class Component6dEulerResiduals extends Component6d {
		parseRigidBodies() {
			for (var i = 0; i < this.rigidBodyCount; i++) {
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
	}

	class ComponentAnalog extends Component {
		constructor(buf, byteOrder) {
			super(buf, byteOrder);

			this.deviceCount = this.munchUInt32();
			this.devices     = [];

			this.parseDevices();
		}

		parseDevices() {
			for (var i = 0; i < this.deviceCount; i++) {
				var device = {
					id:            this.munchUInt32(),
					channelCount:  this.munchUInt32(),
					sampleCount:   this.munchUInt32(),
					sampleNumber:  this.munchUInt32(),
					data:          [],
				};

				for (var j = 0; j < device.channelCount; j++) {
					var channel = [];
					for (var k = 0; k < device.sampleCount; k++)
						channel.push(this.munchFloat());
					device.data.push(channel);
				}

				this.devices.push(device);
			}
		}

		toJson() {
			return {
				deviceCount: this.deviceCount,
				devices: this.devices,
			};
		}
	}

	class ComponentAnalogSingle extends ComponentAnalog {
		parseDevices() {
			for (var i = 0; i < this.deviceCount; i++) {
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

	}

	class ComponentForce extends Component {
		constructor(buf, byteOrder) {
			super(buf, byteOrder);

			// XXX: Not quite sure about this, but sometimes QTM sends empty
			// force components.
			if (this.size === 12)
				this.plateCount = 0;
			else
				this.plateCount = this.munchUInt32();

			this.plates = [];

			this.parsePlates();
		}

		parsePlates() {
			for (var i = 0; i < this.plateCount; i++) {
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
		}

		toJson() {
			return {
				plateCount: this.plateCount,
				plates: this.plates,
			};
		}
	}

	class ComponentForceSingle extends ComponentForce {
		parsePlates() {
			for (var i = 0; i < this.plateCount; i++) {
				var plate = {
					id:   this.munchUInt32(),
					data: [{
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
	}

	class ComponentImage extends Component {
		constructor(buf, byteOrder) {
			super(buf, byteOrder);

			this.cameraCount = this.munchUInt32();
			this.cameras     = [];

			this.parseCameras();
		}

		parseCameras() {
			for (var i = 0; i < this.cameraCount; i++) {
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
		}

		toJson() {
			return {
				cameraCount: this.cameraCount,
				cameras: this.plates,
			};
		}
	}

	class ComponentGazeVector extends Component {
		constructor(buf, byteOrder) {
			super(buf, byteOrder);

			this.gazeVectorCount = this.munchUInt32();
			this.gazeVectors     = [];

			this.parseGazeVectors();
		}

		parseGazeVectors() {
			for (var i = 0; i < this.gazeVectorCount; i++) {
				var gazeVector   = {
					sampleCount: this.munchUInt32(),
					samples: [],
				};

				gazeVector.sampleNumber = (gazeVector.sampleCount > 0) ? this.munchUInt32() : 0;

				for (var j = 0; j < gazeVector.sampleCount; j++) {
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
		}
	}

	class ComponentTimecode extends Component {
		constructor(buf, byteOrder) {
			super(buf, byteOrder);

			this.timecodeCount = this.munchUInt32();
			this.timecodes     = [];

			this.parseTimecodes();
		}

		parseTimecodes() {
			for (var i = 0; i < this.timecodeCount; i++) {
				var timecode   = {
					type: this.munchUInt32(),
					low: this.munchUInt32(),
					high: this.munchUInt32(),
				};

				this.timecodes.push(timecode);
			}
		}

		toJson() {
			return {
				timecodes: this.timecodes
			};
		}
	}

	class ComponentSkeleton extends Component {
		constructor(buf, byteOrder) {
			super(buf, byteOrder);

			this.skeletonCount = this.munchUInt32();
			this.skeletons     = [];

			this.parseSkeletons();
		}

		parseSkeletons() {
			for (var i = 0; i < this.skeletonCount; i++) {
				var skeleton = {
					segmentCount: this.munchUInt32(),
					segments: [],
				};

				for (var j = 0; j < skeleton.segmentCount; j++) {
					skeleton.segments.push({
						id: this.munchUInt32(),
						positionX: this.munchFloat(),
						positionY: this.munchFloat(),
						positionZ: this.munchFloat(),
						rotationX: this.munchFloat(),
						rotationY: this.munchFloat(),
						rotationZ: this.munchFloat(),
						rotationW: this.munchFloat(),
					});
				}

				this.skeletons.push(skeleton);
			}
		}

		toJson() {
			return {
				skeletons: this.skeletons
			};
		}
	}

	class ComponentEyeTracker extends Component {
		constructor(buf, byteOrder) {
			super(buf, byteOrder);

			this.eyeTrackerCount = this.munchUInt32();
			this.eyeTrackers     = [];

			this.parseEyeTrackers();
		}

		parseEyeTrackers() {
			for (var i = 0; i < this.eyeTrackerCount; i++) {
				var eyeTracker = {
					sampleCount: this.munchUInt32(),
					samples: [],
				};

				for (var j = 0; j < eyeTracker.sampleCount; j++) {
					eyeTracker.samples.push({
						leftPupil: this.munchFloat(),
						rightPupil: this.munchFloat(),
					});
				}

				this.eyeTrackers.push(eyeTracker);
			}
		}

		toJson() {
			return {
				eyeTrackers: this.eyeTrackers
			};
		}
	}

	module.exports = Component;
})();
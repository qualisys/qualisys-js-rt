'use strict';

(function() {
	var _           = require('lodash')
	  , jsonxml     = require('jsontoxml')
	  , sprintf     = require('sprintf')
	  , qtmrt       = require('./qtmrt')
	  , Packet      = require('./packet')
	  , writeUInt32 = require('./buffer-io').writeUInt32
	  , byteOrder   = qtmrt.LITTLE_ENDIAN
	;

	class Command {
		static get _byteOrder() { return byteOrder; }
		static set _byteOrder(value) { byteOrder = value; }

		static createPacket(cmdStr) {
			var buf = Buffer.alloc(qtmrt.HEADER_SIZE + cmdStr.length);

			writeUInt32(buf, buf.length, 0, Command._byteOrder);
			writeUInt32(buf, qtmrt.COMMAND, qtmrt.UINT32_SIZE, Command._byteOrder);
			buf.write(cmdStr, qtmrt.HEADER_SIZE, cmdStr.length, 'utf8');

			return new Packet(buf, Command._byteOrder);
		}

		static byteOrder()              { return this.createPacket('ByteOrder'); }
		static calibrate(refine)        { return this.createPacket('Calibrate' + (_.isUndefined(refine) ? '' : refine)); }
		static closeMeasurement()       { return this.createPacket('Close'); }
		static getCaptureC3d()          { return this.createPacket('GetCaptureC3D'); }
		static getCaptureQtm()          { return this.createPacket('GetCaptureQtm'); }
		static getState()               { return this.createPacket('GetState'); }
		static led(camera, mode, color) { return this.createPacket(sprintf('Led %s %s %s', camera, mode, color)); }
		static load(filename, connect)  { return this.createPacket('Load ' + filename + (_.isUndefined(connect) ? '' : connect)); }
		static loadProject(projectPath) { return this.createPacket('LoadProject ' + projectPath); }
		static newMeasurement()         { return this.createPacket('New'); }
		static qtmVersion()             { return this.createPacket('QTMVersion'); }
		static startCapture()           { return this.createPacket('Start'); }
		static stopCapture()            { return this.createPacket('Stop'); }
		static releaseControl()         { return this.createPacket('ReleaseControl'); }
		static reprocess()              { return this.createPacket('Reprocess'); }
		static setQtmEvent(label)       { return this.createPacket('SetQTMEvent ' + label); }
		static stopStreaming()          { return this.createPacket('StreamFrames Stop'); }
		static takeControl(pass)        { return this.createPacket('TakeControl ' + (_.isUndefined(pass) ? '' : pass)); }
		static trigger()                { return this.createPacket('Trig'); }
		static version(major, minor)    { return this.createPacket('Version ' + major + '.' + minor); }

		static getCurrentFrame() {
			var predicate  = function(component) { return _.includes(Object.keys(qtmrt.COMPONENTS), component); }
			  , components = arguments.length === 0 ? [] : _.filter(arguments, predicate)
			;

			if (_.isEmpty(components))
				throw new TypeError('No valid components specified');

			return this.createPacket('GetCurrentFrame ' + components.join(' '));
		}

		static getParameters() {
			var predicate = (component) => {
					return _.includes(['All', 'General', 'Calibration', '3D', '6D', 'Analog', 'Force', 'Image', 'GazeVector', 'EyeTracker', 'Timecode', 'Skeleton', 'Skeleton:global'], component);
				}
			   , components = _.filter(arguments, predicate)
			;

			if (_.includes(components, 'All') || arguments.length === 0)
				components = ['All'];

			return this.createPacket('GetParameters ' + components.join(' '));
		}

		static save(filename, overwrite) {
			var cmdStr = 'Save ' + filename + (_.isUndefined(overwrite) ? '' : (' ' + overwrite));
			return this.createPacket(cmdStr);
		}

		static setParameters(params) {
			var xml = jsonxml({ 'QTM_Settings': params }) + '\0'
			  , buf = Buffer.alloc(qtmrt.HEADER_SIZE + xml.length + 1)
			;

			writeUInt32(buf, buf.length, 0);
			writeUInt32(buf, qtmrt.XML, qtmrt.UINT32_SIZE);
			buf.write(xml, qtmrt.HEADER_SIZE);

			return Packet.create(buf, Command._byteOrder);
		}

		static streamFrames(options) {
			if (arguments.length === 0)
				options = {};

			options = _.defaults(options, {
				frequency: 100,
				components: [],
			});

			var udp        = _.isUndefined(options.udpPort) ? '' : ' UDP:' + (_.isUndefined(options.udpAddress) ? '' : options.udpAddress + ':') + options.udpPort
			  , frequency  = ''
			  , predicate  = function(component) { return _.includes(Object.keys(qtmrt.COMPONENTS), component); }
			  , components = _.filter(options.components, predicate)
			;

			if (options.frequency < 1)
				frequency = 'FrequencyDivisor:' + (1 / options.frequency);
			else if (isNaN(options.frequency))
				frequency = 'AllFrames';
			else
				frequency = 'Frequency:' + options.frequency;

			if (_.isEmpty(components))
				throw new TypeError('No valid components specified');

			var cmdStr = 'StreamFrames ' + frequency + udp + ' ' + components.join(' ');
			return this.createPacket(cmdStr);
		}
	}

	module.exports = Command;
})();
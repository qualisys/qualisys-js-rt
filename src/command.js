'use strict';

(function() {
	var _           = require('lodash')
	  , jsonxml     = require('jsontoxml')
	  , qtmrt       = require('./qtmrt')
	  , Packet      = require('./packet')
	  , Component   = require('./component')
	  , writeUInt32 = require('./buffer-io').writeUInt32
	  , byteOrder   = qtmrt.LITTLE_ENDIAN
	;

	class Command {
		static get _byteOrder() { return byteOrder; }
		static set _byteOrder(value) { byteOrder = value; }

		static createPacket(cmdStr) {
			var buf = new Buffer(qtmrt.HEADER_SIZE + cmdStr.length);

			writeUInt32(buf, buf.length, 0, Command._byteOrder);
			writeUInt32(buf, qtmrt.COMMAND, qtmrt.UINT32_SIZE, Command._byteOrder);
			buf.write(cmdStr, qtmrt.HEADER_SIZE, cmdStr.length, 'utf8');

			return new Packet(buf, Command._byteOrder);
		}

		static qtmVersion()             { return this.createPacket('QTMVersion'); }
		static byteOrder()              { return this.createPacket('ByteOrder'); }
		static getState()               { return this.createPacket('GetState'); }
		static releaseControl()         { return this.createPacket('ReleaseControl'); }
		static newMeasurement()         { return this.createPacket('New'); }
		static close()                  { return this.createPacket('Close'); }
		static start()                  { return this.createPacket('Start'); }
		static stop()                   { return this.createPacket('Stop'); }
		static getCaptureC3d()          { return this.createPacket('GetCaptureC3D'); }
		static getCaptureQtm()          { return this.createPacket('GetCaptureQtm'); }
		static trigger()                { return this.createPacket('Trig'); }
		static stopStreaming()          { return this.createPacket('StreamFrames Stop'); }
		static setQtmEvent(label)       { return this.createPacket('SetQTMEvent ' + label); }
		static takeControl(pass)        { return this.createPacket('TakeControl ' + (_.isUndefined(pass) ? '' : pass)); }
		static load(filename)           { return this.createPacket('Load ' + filename); }
		static loadProject(projectPath) { return this.createPacket('LoadProject ' + projectPath); }
		static version(major, minor)    { return this.createPacket('Version ' + major + '.' + minor); }

		static getParameters() {
			var predicate = (component) => {
					return _.includes(['All', 'General', '3D', '6D', 'Analog', 'Force', 'Image'], component);
				}
			   , components = _.filter(arguments, predicate)
			;

			if (_.includes(components, 'All'))
				components = ['All'];

			return this.createPacket('GetParameters ' + components.join(' '));
		}

		static setParameters(params, byteOrder) {
			var xml = jsonxml({ 'QTM_Settings': params }) + '\0'
			  , buf = new Buffer(qtmrt.HEADER_SIZE + xml.length + 1)
			;

			writeUInt32(buf, buf.length, 0);
			writeUInt32(buf, qtmrt.XML, qtmrt.UINT32_SIZE);
			buf.write(xml, qtmrt.HEADER_SIZE);

			return Packet.create(buf, byteOrder);
		}

		static getCurrentFrame() {
			var predicate  = function(component) { return _.includes(_.union(['All'], Object.keys(qtmrt.COMPONENTS)), component); }
			  , components = arguments.length === 0 ? ['All'] : _.filter(arguments, predicate);
			;

			if (_.isEmpty(components))
				throw new TypeError('No valid components specified');

			if (_.includes(components, 'All'))
				components = ['All'];

			return this.createPacket('GetCurrentFrame ' + components.join(' '));
		}

		static streamFrames(options) {
			if (arguments.length === 0)
				options = {};

			options = _.defaults(options, {
				frequency: 100,
				components: ['All'],
			});

			var udp        = _.isUndefined(options.udpPort) ? '' : ' UDP:' + (_.isUndefined(options.udpAddress) ? '' : options.udpAddress + ':') + options.udpPort
			  , frequency  = ''
			  , predicate  = function(component) { return _.includes(_.union(['All'], Object.keys(qtmrt.COMPONENTS)), component); }
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

			if (_.includes(components, 'All'))
				components = ['All'];

			var cmdStr = 'StreamFrames ' + frequency + udp + ' ' + components.join(' ');
			return this.createPacket(cmdStr);
		}

		static save(filename, overwrite) {
			var cmdStr = 'Save ' + filename + (_.isUndefined(overwrite) ? '' : (' ' + overwrite));
			return this.createPacket(cmdStr);
		}
	}

	module.exports = Command;
})();
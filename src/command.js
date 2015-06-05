'use strict';

(function() {
	var _           = require('underscore')
	  , jsonxml     = require('jsontoxml')
	  , qtmrt       = require('./qtmrt')
	  , Model       = require('./model')
	  , Packet      = require('./packet')
	  , Component   = require('./component')
	  , writeUInt32 = require('./helpers').writeUInt32
	;

	var Command = {
		createPacket: function(cmdStr)
		{
			var buf = new Buffer(qtmrt.HEADER_SIZE + cmdStr.length);
			
			writeUInt32(buf, buf.length, 0);
			writeUInt32(buf, qtmrt.COMMAND, qtmrt.UINT32_SIZE);
			buf.write(cmdStr, qtmrt.HEADER_SIZE, cmdStr.length, 'utf8');

			return new Packet(buf);
		},

		qtmVersion:      function()             { return this.createPacket('QTMVersion'); },
		byteOrder:       function()             { return this.createPacket('ByteOrder'); },
		getState:        function()             { return this.createPacket('GetState'); },
		releaseControl:  function()             { return this.createPacket('ReleaseControl'); },
		newMeasurement:  function()             { return this.createPacket('New'); },
		close:           function()             { return this.createPacket('Close'); },
		start:           function()             { return this.createPacket('Start'); },
		stop:            function()             { return this.createPacket('Stop'); },
		getCaptureC3D:   function()             { return this.createPacket('GetCaptureC3D'); },
		getCaptureQtm:   function()             { return this.createPacket('GetCaptureQtm'); },
		trig:            function()             { return this.createPacket('Trig'); },
		stopStreaming:   function()             { return this.createPacket('StreamFrames Stop'); },
		setQtmEvent:     function(label)        { return this.createPacket('SetQTMEvent ' + label); },
		takeControl:     function(pass)         { return this.createPacket('TakeControl ' + (_.isUndefined(pass) ? '' : pass)); },
		load:            function(filename)     { return this.createPacket('Load ' + filename); },
		loadProject:     function(projectPath)  { return this.createPacket('LoadProject ' + projectPath); },
		version:         function(major, minor) { return this.createPacket('Version ' + major + '.' + minor); },

		getParameters: function()
		{
			var predicate = function(component) {
					return _.contains(['All', 'General', '3D', '6D', 'Analog', 'Force', 'Image'], component);
				}
			   , components = _.filter(arguments, predicate)
			;

			if (_.contains(components, 'All'))
				components = ['All'];

			return this.createPacket('GetParameters ' + components.join(' '));
		},

		setParameters: function(params)
		{
			var xml = jsonxml({ 'QTM_Settings': params }) + '\0'
			  , buf = new Buffer(qtmrt.HEADER_SIZE + xml.length + 1)
			;

			writeUInt32(buf, buf.length, 0);
			writeUInt32(buf, qtmrt.XML, qtmrt.UINT32_SIZE);
			buf.write(xml, qtmrt.HEADER_SIZE);

			return Packet.create(buf);
		},

		getCurrentFrame: function(component)
		{
			var predicate = function(component) {
					return _.contains(_.values(qtmrt.COMPONENTS), component);
				}
			   , components = _.filter(arguments, predicate)
			;

			if (_.contains(arguments, qtmrt.COMPONENT_ALL))
				components = [qtmrt.COMPONENT_ALL];

			return this.createPacket('GetCurrentFrame ' + components.map(Component.typeToString).join(' '));
		},


		streamFrames: function(options)
		{
			if (!arguments.length)
				options = {};

			options = _.defaults(options, {
				frequency: 100,
				components: ['All'],
			});

			var udp = _.isUndefined(options.udpPort)
					? ''
					: ' UDP:' + (_.isUndefined(options.udpAddress) ? '' : options.udpAddress + ':') + options.udpPort
			  , frequency = ''
			  , predicate = function(component) {
					return _.contains(_.union(['All'], Object.keys(qtmrt.COMPONENTS)), component);
				}
			  , components = _.filter(options.components, predicate)
			;

			if (1 > options.frequency)
				frequency = 'FrequencyDivisor:' + (1 / options.frequency);
			else if (isNaN(options.frequency))
				frequency = 'AllFrames';
			else
				frequency = 'Frequency:' + options.frequency;

			if (_.isEmpty(components))
				throw new TypeError('No valid components specified');

			if (_.contains(components, 'All'))
				components = ['All'];

			var cmdStr = 'StreamFrames ' + frequency + udp + ' ' + components.join(' ');
			return this.createPacket(cmdStr);
		},


		save: function(filename, overwrite)
		{
			var cmdStr = 'Save ' + filename + (_.isUndefined(overwrite) ? '' : (' ' + overwrite));
			return this.createPacket(cmdStr);
		},


	};

	module.exports = Command;
})();

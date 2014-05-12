'use strict';

var _      = require('underscore')
  , qtmrt  = require('./qtmrt')
  , Model  = require('./model')
  , Packet = require('./packet').Packet
;

var Command = {
	build: function(cmdStr)
	{
		var buf = new Buffer(qtmrt.HEADER_SIZE + cmdStr.length);
		
		if (qtmrt.byteOrder == qtmrt.LITTLE_ENDIAN)
		{
			buf.writeUInt32LE(buf.length, 0);
			buf.writeUInt32LE(qtmrt.COMMAND, 4);
		}
		else
		{
			buf.writeUInt32BE(buf.length);
			buf.writeUInt32BE(qtmrt.COMMAND, qtmrt.UINT32_SIZE);
		}

		buf.write(cmdStr, qtmrt.HEADER_SIZE, cmdStr.length, 'utf8');

		return buf;
	},

	qtmVersion:      function()             { return this.build('QTMVersion'); },
	byteOrder:       function()             { return this.build('ByteOrder'); },
	getState:        function()             { return this.build('GetState'); },
	releaseControl:  function()             { return this.build('ReleaseControl'); },
	newMeasurement:  function()             { return this.build('New'); },
	close:           function()             { return this.build('Close'); },
	start:           function()             { return this.build('Start'); },
	stop:            function()             { return this.build('Stop'); },
	getCaptureC3D:   function()             { return this.build('GetCaptureC3D'); },
	getCaptureQtm:   function()             { return this.build('GetCaptureQtm'); },
	trig:            function()             { return this.build('Trig'); },
	stopStreaming:   function()             { return this.build('StreamFrames Stop'); },
	setQtmEvent:     function(label)        { return this.build('SetQTMEvent ' + label); },
	takeControl:     function(pass)         { return this.build('TakeControl ' + (_.isUndefined(pass) ? '' : pass)); },
	load:            function(filename)     { return this.build('Load ' + filename); },
	loadProject:     function(projectPath)  { return this.build('LoadProject ' + projectPath); },
	version:         function(major, minor) { return this.build('Version ' + major + '.' + minor); },

	getParameters: function()
	{
		var predicate = function(component) {
				return _.contains(['All', 'General', '3D', '6D', 'Analog', 'Force', 'Image'], component);
			}
		   , components = _.filter(arguments, predicate)
		;

		if (_.contains(components, 'All'))
			components = ['All'];

		return this.build('GetParameters ' + components.join(' '));
	},

	getCurrentFrame: function()
	{
		var predicate = function(component) {
				return _.contains(['All', '2D', '2DLin', '3D', '3DRes', '3DNoLabels',
				'3DNoLabelsRes', 'Analog', 'AnalogSingle', 'Force', '6D', '6DRes',
				'6DEuler', '6DEulerRes', 'Image'], component);
			}
		   , components = _.filter(arguments, predicate)
		;

		if (_.contains(components, 'All'))
			components = ['All'];

		return this.build('GetCurrentFrame ' + components.join(' '));
	},


	streamFrames: function(frequency, components, updPort, udpAddress)
	{
		var udp = _.isUndefined(updPort)
				? ''
				: ' UDP:' + (_.isUndefined(udpAddress) ? '' : udpAddress + ':') + udpPort
		  , predicate = function(component) {
				return _.contains(['All', '2D', '2DLin', '3D', '3DRes', '3DNoLabels',
				'3DNoLabelsRes', 'Analog', 'AnalogSingle', 'Force', '6D', '6DRes',
				'6DEuler', '6DEulerRes', 'Image'], component);
			}
		  , components = _.filter(components, predicate)
		;

		if (_.isEmpty(components))
			throw TypeError('No valid components specified');

		if (_.contains(components, 'All'))
			components = ['All'];

		var cmdStr = 'StreamFrames ' + frequency + udp + ' ' + components.join(' ');
		return this.build(cmdStr);
	},


	save: function(filename, overwrite)
	{
		var cmdStr = 'Save ' + filename + (_.isUndefined(overwrite) ? '' : (' ' + overwrite));
		return this.build(cmdStr);
	},


};

module.exports = {
	Command: Command,
}

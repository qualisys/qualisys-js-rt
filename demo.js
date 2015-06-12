'use strict';

var colors   = require('colors')
  , qtmrt    = require('./index')
  , Api      = qtmrt.Api
  , Viewer2d = require('./src/viewer2d')
;

var api = new Api({ debug: true });

api.on('frame', function(data) {
	console.log('Received frame:'.green);
	console.log(data);
});

api.on('end', function(data) {
	console.log('No more data!'.red);
	//api.disconnect();
});

api.on('event', function(event) {
	console.log(event.name.yellow);
});

api.on('disconnect', function(event) {
	process.exit();
});

api.connect()
	.then(function() { return api.qtmVersion(); })
	.then(function(version) { return api.byteOrder(); })
	.then(function(byteOrder) { return api.getState(); })
	//.then(function() { return api.discover(); })
	//.then(function(servers) { console.log(servers); })

	//.then(function(state) { return api.getCurrentFrame(qtmrt.COMPONENT_ANALOG); })
	//.then(function(frame) { console.log(frame); })
	//.then(function() { return api.getParameters('All'); })
	//.then(function(parameters) {
		//console.log(parameters.the6d);
		//console.log(parameters.the3d);
	//})
	//.then(function() { return api.takeControl(); })
	//.then(function() {
		//var viewer = new Viewer2d(api);
		//return viewer.render(1, { color: 'red' });
	//})
	//.then(function() { return api.setParameters({
			//'Image': {
				//'Camera': {
					//'ID': 9,
					//'Enabled': 'True',
					//'Format': 'JPG',
					//'Width': 640,
					//'Height': 400
				//}
			//}
	//}); })
	//.then(function() { return api.setParameters({
			//'Image': {
				//'Camera': {
					//'ID': 10,
					//'Enabled': 'False',
				//}
			//}
	//}); })
	//.then(function() { return api.setParameters({ 'General': { 'Capture_Time': 2.5 } }); })
	//.then(function() { return api.releaseControl(); })
	//.then(function() { return api.newMeasurement(); })
	//.then(function() { return api.setQtmEvent('foo_event'); })
	//.then(function() { return api.newMeasurement(); })
	//.then(function() { return api.close(); })
	//.then(function() { return api.start(); })
	//.then(function() { return api.stop(); })
	//.then(function() { return api.load('dadida'); })
	//.then(function() { return api.save('dadida'); })
	//.then(function() { return api.loadProject('dadida'); })
	//.then(function() { return api.trig(); })
	//.then(function() { return api.getCaptureC3D(); })
	//.then(function() { return api.getCaptureQtm(); })
	//.then(function() { return api.stopStreaming(); })
	//.then(function() { return api.streamFrames() })
	//.then(function() { return api.streamFrames({ components: ['All'], frequency: 1/100 }) })
	//.then(function() { return api.stopStreaming() })
	//.then(function() { return api.streamFrames({ components: ['All'], frequency: 1/10 }) })
	//.then(function() { return api.streamFrames({ components: ['All'], frequency: 'AllFrames' }) })
	//.then(function() { return api.streamFrames({ components: ['2D'], frequency: '2' }) })
	//.then(function() { return api.streamFrames({ components: ['Image'], frequency: '2' }) })
	//.then(function() { return api.streamFrames({ components: ['3D'], frequency: 1/50 }) })
	//.then(function() { return api.streamFrames({ udpPort: 15000, components: ['3D'], frequency: 1/100 }) })
	//.then(function() { return api.streamFrames({ components: ['3D'] }) })
	//.then(function() { return api.streamFrames({ components: ['Force', 'Image', 'Analog', 'AnalogSingle', '6D', '3D', '2D'], frequency: 'AllFrames' }) })
	//.then(function() { return api.streamFrames({ frequency: 100, components: ['3DNoLabels'] }); })
	//.then(function() { return api.streamFrames({ frequency: 1/100, components: ['3DRes'] }); })
	//.then(function() { return api.streamFrames({ frequency: 1/100, components: ['3DNoLabelsRes'] }); })
	//.then(function() { return api.streamFrames({ frequency: 1/100, components: ['6D'] }); })
	//.then(function() { return api.streamFrames({ frequency: 1/100, components: ['6DRes'] }); })
	//.then(function() { return api.streamFrames({ frequency: 1/100, components: ['6DEuler'] }); })
	//.then(function() { return api.streamFrames({ frequency: 1/100, components: ['6DEulerRes'] }); })
	//.then(function() { return api.streamFrames({ frequency: 1/100, components: ['Analog'] }); })
	//.then(function() { return api.streamFrames({ frequency: 1/100, components: ['AnalogSingle'] }); })
	//.then(function() { return api.streamFrames({ frequency: 1/100, components: ['Force'] }); })
	//.then(function() { return api.streamFrames({ frequency: 1/100, components: ['ForceSingle'] }); })
	//.then(function() { return api.streamFrames({ frequency: 1/100, components: ['Image'] }); })
	//.then(function() { return api.streamFrames({ frequency: 1/200, components: ['GazeVector'] }); })
	//.then(function() { return api.disconnect(); })

	.catch(function(err) {
		console.log(err);
	})
;

// Handle graceful shutdown {{{
if (process.platform === 'win32') {
	var rl = require('readline').createInterface({
		input: process.stdin,
		output: process.stdout
	});

	rl.on('SIGINT', function () {
		process.emit('SIGINT');
	});
}

process.on('SIGINT', function () {
	process.exit();
});
// }}} End Handle graceful shutdown

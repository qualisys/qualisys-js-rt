var Q         = require('Q')
  , _         = require('underscore')
  , colors    = require('colors')
  , isNumeric = require('isnumeric')
;

var Viewer2d = function(api, options) {
	this.options         = options;
	this.api             = api;
	this.numberInput     = [];
	this.capturingNumber = false;
	this.exit            = false;
};

Viewer2d.prototype = (function()
{
	var render = function(camera, options)
	{
		var self     = this
		  , deferred = Q.defer()
		  , debug    = this.api.options.debug
		;

		this.camera  = camera;
		this.options = _.defaults(options, {
			frequency: 50,
		});

		this.api.debug(false);

		listenForInput.call(this);
		
		this.api.getParameters('General')
			.then(function(params) {
				self.parameters = params.general.camera;
				return self.api.streamFrames({ components: ['2D'], frequency: options.frequency });
			})
			.then(function() {

				self.api.on('frame', function(data) {
					var statusLine = 'CAMERA SELECT'
					  , comp       = data.components['2d']
					;

					if (!_.isUndefined(self.width))
						clear.call(self);
	
					setupView.call(self, self.camera);
					drawMarkers.call(self, self.camera, data.components['2d'].cameras);

					self.cameraCount = comp.cameraCount;

					for (var i = 1; i <= comp.cameraCount; i++)
						statusLine += self.camera === i ? (' [' + i + ']').green : '  ' + i + ' ';

					statusLine += '  (N)ext  (P)rev       (Q)uit';
					process.stdout.write(statusLine + ' ');
				});

				self.api.on('end', function(data) {
					this.api.debug(debug);
					if (this.exit)
						process.exit(); 
						
	  				process.stdin.removeAllListeners('data');
					process.stdin.on('data', function(char) { 
						// Ctrl+C.
						if (char === '\3')
							process.exit(); 
					}.bind(this));

					deferred.resolve();
				}.bind(self));

			})
			.catch(function(err) {
				deferred.reject(err);
			});

		return deferred.promise;
	},

	setupView = function(camera)
	{
		var fontAspect = 0.42
		  , maxHeight  = 0
		  , aspect     = 0
		  , minAspect  = 999
		;

		for (var i = 0; i < this.parameters.length; i++)
		{
			aspect    = Number(this.parameters[i].markerRes.width) / Number(this.parameters[i].markerRes.height);
			minAspect = aspect < minAspect ? aspect : minAspect;
		}

		this.width      = this.parameters[camera - 1].markerRes.width;
		this.height     = this.parameters[camera - 1].markerRes.height;
		this.viewWidth  = 80;
		this.viewHeight = Math.round(this.viewWidth * (this.width / this.height) * fontAspect);
		this.maxHeight  = Math.ceil(this.viewWidth * minAspect * fontAspect);
	},

	drawMarkers = function(camera, data)
	{
		var cameraData = data[camera - 1]
		  , lines      = []
		  , zero       = function () { return 0; }
		;

		for (var i = 0; i < this.maxHeight; i++)
			lines[i] = _.range(this.viewWidth).map(zero);

		for (i in cameraData.markers)
		{
			var marker = cameraData.markers[i];
			var x = Math.round((marker.x / this.width) * this.viewWidth);
			var y = Math.min(Math.round((marker.y / this.height) * this.viewHeight), this.maxHeight - 1);

			lines[y][x] = (marker.diameterX + marker.diameterY) / 2;
		}

		for (i in lines)
		{
			var lineStr = '';

			for (var c in lines[i])
			{
				if (0 === lines[i][c])
					lineStr += ' ';
				else
				{
					if (100 > lines[i][c])
						lineStr += '.'[this.options.color];
					else if (200 > lines[i][c])
						lineStr += '*'[this.options.color];
					else if (400 > lines[i][c])
						lineStr += 'x'[this.options.color];
					else if (800 > lines[i][c])
						lineStr += 'X'[this.options.color];
				}
			}
			process.stdout.write(lineStr + ' ' + "\n");
		}
	},
	
	keypressListener = function(char)
	{
		if (isNumeric(char))
		{
			this.numberInput.push(char);

			if (!this.capturingNumber)
				setTimeout(function() {
					var number = Number(this.numberInput.join(''));

					this.camera          = Math.min(number, this.cameraCount);
					this.capturingNumber = false;
					this.numberInput     = [];
				}.bind(this), 450);

			this.capturingNumber = true;
		}

		// n, l and left arrow.
		if ('n' === char || 'l' === char || '\u001b[C' === char)
			this.camera = Math.min(this.camera + 1, this.cameraCount);

		// p, h and right arrow.
		if ('p' === char || 'h' === char || '\u001b[D' === char)
			this.camera = Math.max(this.camera - 1, 1);

		if ('q' === char)
			quit.call(this);

		// Ctrl+C.
		if ('\3' === char)
			quit.call(this, true);
	},

	listenForInput = function()
	{
		process.stdin.resume(); 
		process.stdin.setEncoding('utf8'); 
		process.stdin.setRawMode(true); 

		process.stdin.on('data', keypressListener.bind(this));
	},

	clear = function()
	{
		process.stdout.moveCursor(-999, -1);
		process.stdout.moveCursor(-this.viewWidth, -this.maxHeight);
		process.stdout.clearScreenDown();
		process.stdout.moveCursor(0, 1);
	},

	stop = function()
	{
		this.api.stopStreaming();
	},

	quit = function(exit)
	{
		this.exit = arguments.length > 0 && exit;

		process.stdout.moveCursor(0, -1);
		this.api.stopStreaming();
		clear.call(this);
		process.stdout.moveCursor(0, -1);
	}
	;

	return {
		'render': render,
	};
})();

module.exports = Viewer2d;

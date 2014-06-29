'use strict';

module.exports = function(grunt) {

	// Load grunt tasks automatically.
	require('load-grunt-tasks')(grunt);

	grunt.initConfig({
		jshint: {
			options: {
				jshintrc: '.jshintrc'
			},
			src: ['src/**/*'],
		},
	});
};

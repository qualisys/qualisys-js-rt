'use strict';

var gulp = require('gulp')
  , plug = require('gulp-load-plugins')()
;

gulp.task('lint', function() {
	return gulp.src(['src/**/*.js', '!node_modules/**'])
		.pipe(plug.eslint('.eslintrc.js'))
		.pipe(plug.eslint.format())
		.pipe(plug.eslint.failAfterError());
});
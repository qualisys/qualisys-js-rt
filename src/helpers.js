'use strict';

(function() {
	var mixin = function(proto, otherProto) {
		for (var i in otherProto)
			proto[i] = otherProto[i];
	};

	var toCamelCase = function(str) {
		var underscoreCased = str.replace(/[a-z]([A-Z])/g, function(g) { return g[0] + '_' + g[1]; });
		underscoreCased = underscoreCased.replace(/[A-Z]+([A-Z])[a-z]/g, function(g) { return g.substr(0, g.length - 2) + '_' + g.substr(g.length - 2);  });
		return underscoreCased.toLowerCase().replace(/_([a-zA-Z0-9])/g, function(g) { return g[1].toUpperCase(); });
	};

	module.exports = {
		mixin: mixin,
		toCamelCase: toCamelCase,
	};
})();

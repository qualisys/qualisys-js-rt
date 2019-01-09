'use strict';

(function() {
	var toCamelCase = function(str) {
		var underscoreCased = str.replace(/[a-z]([A-Z])/g, function(g) { return g[0] + '_' + g[1]; });
		underscoreCased = underscoreCased.replace(/[A-Z]+([A-Z])[a-z]/g, function(g) { return g.substr(0, g.length - 2) + '_' + g.substr(g.length - 2);  });
		return underscoreCased.toLowerCase().replace(/_([a-zA-Z0-9])/g, function(g) { return g[1].toUpperCase(); });
	};

	module.exports = {
		toCamelCase: toCamelCase,
	};
})();

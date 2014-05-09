'use strict';

var _ = require('underscore');

var Model = function() { };

Model.extend = function(attrs, model)
{
    if (2 > arguments.length)
        model = Model;
    
    var obj = function() {
        model.apply(this, arguments);
        
        if (attrs)
		{
			if (attrs.init)
				attrs.init.apply(this, arguments);

			for (var attr in attrs)
				if (attrs.hasOwnProperty(attr) && 'init' !== attr)
					this[attr] = attrs[attr];
		}
    };

    obj.prototype = Object.create(model.prototype);
    return obj;
}

module.exports = Model;

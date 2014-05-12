'use strict';

var Model = function() { };

Model.extend = function(attrs, _super)
{   
	if (2 > arguments.length)
		_super = Model;

	var construct = function() {
		this._super = _super;
   
	if (attrs)
		{
			for (var attr in attrs)
				if (attrs.hasOwnProperty(attr) && attr !== 'init')
					this[attr] = attrs[attr];

			if (attrs && attrs.init)
				attrs.init.apply(this, arguments);
			else if (_super.init)
				_super.init.apply(this, arguments);
		}
	};
	construct._super = _super;

	if (attrs)
		for (var attr in attrs)
			if (attrs.hasOwnProperty(attr))
				construct[attr] = attrs[attr];

	construct.prototype = Object.create(_super.prototype);
	return construct;
}

module.exports = Model;

'use strict';

(function() {
	var Model = function() {};

	Model.applyChain = function(obj, _super)
	{
		if (_super._super)
			Model.applyChain(obj, _super._super);

		for (var attr in _super)
			if (attr !== 'init' && attr !== 'applyChain' && attr !== '_super')
				obj[attr] = _super[attr];
	};

	Model.extend = function(attrs, _super)
	{   
		if (2 > arguments.length)
			_super = Model;

		var construct = function() {
			this._super = _super;
			Model.applyChain(this, _super);
			
			if (attrs)
			{
				for (var attr in attrs)
					if (attrs.hasOwnProperty(attr) && attr !== 'init')
						this[attr] = attrs[attr];

				if (attrs.init)
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
	};

	module.exports = Model;
})();

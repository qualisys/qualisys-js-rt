module.exports = {
	env: {
		node: true,
		es6: true
	},
	parserOptions: {
		ecmaVersion: 6,
		sourceType: 'module',
		ecmaFeatures: {
			jsx: true
		}
	},
	globals: {
		_: true
	},
	extends: 'eslint:recommended',
	rules: {
		'indent': ['error', 'tab', { SwitchCase: 1 }],
		'quotes': ['warn', 'single', { avoidEscape: true }],
		'linebreak-style': ['error', 'unix'],
		'no-mixed-spaces-and-tabs': ['warn', 'smart-tabs'],
		'semi': ['error', 'always'],
		'comma-dangle': ['error', 'only-multiline'],
		'no-console': 'off',
		'no-trailing-spaces': ['warn'],
		'yoda': ['warn'],
		'no-whitespace-before-property': ['warn'],
		'no-unused-vars': ['error', { 'args': 'none' }],
		'operator-linebreak': ['warn', 'before'],
		'space-infix-ops': ['error'],
		'space-unary-ops': ['error', { 'words': true, 'nonwords': false }],
		'spaced-comment': ['error', 'always', {
			line: {
				'markers': ['/'],
				'exceptions': ['-', '+']
			},
			'block': {
				'markers': ['!'],
				'exceptions': ['*'],
				'balanced': true
			}
		}],
		'comma-spacing': ['error', { 'after': true }],
		'brace-style': ['error', 'stroustrup', { allowSingleLine: true }],
		'space-in-parens': ['error', 'never'],
		'space-before-function-paren': ['error', 'never'],
		'keyword-spacing' : ['error', { before: true, after: true }],
	}
}

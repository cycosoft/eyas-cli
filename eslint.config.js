import globals from 'globals';
import pluginJs from '@eslint/js';

export default [
	{
		ignores: ['dist/**'],
		files: ['**/*.js'],
		languageOptions: {
			globals: {
				...globals.commonjs,
				// ...globals.es2021,
				eyas: 'readonly'
			},
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module'
			}
		},
		rules: {
			...pluginJs.configs.recommended.rules,
			// Existing custom rules
			'no-console': 'off', // Changed to off to allow console statements
			'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
			'no-unused-vars': 'warn',
			indent: ['error', 'tab'],
			quotes: ['error', 'single'],
			semi: ['error', 'always'],
			'comma-dangle': ['error', 'never'],
			'quote-props': ['error', 'as-needed'],
			'prefer-const': ['error'],
			'arrow-parens': ['error', 'as-needed'],
			'no-spaced-func': ['error'],
			'no-trailing-spaces': ['error'],
			'spaced-comment': ['error', 'always']
		}
	},
	{
		files: [
			'eslint.config.js',
			'src/scripts/**/*.js',
			'src/cli/index.js'
		],
		languageOptions: {
			globals: {
				...globals.node
			},
			parserOptions: {
				sourceType: 'script'
			}
		}
	}
];

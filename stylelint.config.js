export default {
	extends: ['stylelint-config-standard'],
	plugins: ['stylelint-order'],
	overrides: [
		{
			files: ['**/*.svelte'],
			customSyntax: 'postcss-html'
		}
	],
	rules: {
		'alpha-value-notation': null,
		'at-rule-no-unknown': [
			true,
			{
				ignoreAtRules: ['view-transition']
			}
		],
		'color-function-notation': null,
		'custom-property-empty-line-before': null,
		'declaration-block-no-redundant-longhand-properties': null,
		'hue-degree-notation': null,
		'lightness-notation': null,
		'order/properties-alphabetical-order': true,
		'property-no-unknown': [
			true,
			{
				ignoreProperties: ['line-clamp', 'text-box']
			}
		],
		'selector-class-pattern':
			'^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:__(?:[a-z0-9]+(?:-[a-z0-9]+)*))?(?:--(?:[a-z0-9]+(?:-[a-z0-9]+)*))*$',
		'selector-pseudo-class-no-unknown': [
			true,
			{
				ignorePseudoClasses: ['global']
			}
		]
	}
};

module.exports = {
    processors: [
        '@mapbox/stylelint-processor-arbitrary-tags',
        // 'stylelint-processor-html',
    ],
    extends: [
        'stylelint-config-standard',
        // 'stylelint-config-recess-order',
    ],
    rules: {
        indentation: 4,
        'no-empty-source': null,
        'color-hex-length': null,
        'unit-no-unknown': [true, {
            ignoreUnits: ['dpx', 'rpx'],
        }],
        'unit-whitelist': [['px', 'deg', 's', 'ms', '%'], {
            ignoreProperties: {
                'vw': ['/width/', 'left', 'right'],
                'vh': ['/height/', 'top', 'bottom'],
                'dpx': ['/font-size|line-height/'],
                'rpx': ['/border/'],
                // 'px': ['/^(?!font-size)/'],
            },
        }],
        'declaration-property-unit-whitelist': {
            'font-size': ['dpx'],
            'line-height': ['dpx', 'px'],
            "/border/": ['rpx', 'px', '%'],
        },
        'property-blacklist': ['font-family'],
        'property-no-vendor-prefix': true,
        'rule-empty-line-before': 'never',
        'selector-list-comma-newline-after': null,
        'selector-list-comma-space-after': 'always-single-line',
        'selector-pseudo-element-colon-notation': 'single',
    },
};

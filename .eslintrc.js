module.exports = {
    root: true,
    parser: 'babel-eslint',
    env: {
        browser: true,
    },
    parserOptions: {
        sourceType: 'module',
    },
    extends: 'airbnb-base',
    // required to lint *.vue files
    plugins: [
        'html',
    ],
    // check if imports actually resolve
    settings: {
        'import/resolver': {
            webpack: {
                config: 'build/webpack.config.base.js',
            },
        },
    },
    // add your custom rules here
    rules: {
        // 允许在内部 require，以实现 client 端组件按需加载
        'global-require': 0,
        // 代码最长不超过 200 字符
        'max-len': ['error', 200],
        // 允许大写字母开头的函数可以不是构造函数
        'new-cap': ['error', {
            'capIsNew': false,
        }],
        // 不要添加 'vue': 'never'，否则会出现 Resolve error: Cannot read property 'env' of undefined 错误
        'import/extensions': ['error', 'always', {
            'js': 'never',
        }],
        'indent': ['error', 4, {
            'SwitchCase': 1,
        }],
        // 排除 { commit }
        'no-unused-vars': ['error', {
            'args': 'after-used',
            'argsIgnorePattern': 'commit',
        }],
        'no-param-reassign': ['error', {
            'props': false,
        }],
        // 函数没必要总是 return
        'consistent-return': 0,
        // 方法名可以以下划线开头
        'no-underscore-dangle': 0,
        // 通过 Webpack UglifyJsPlugin 插件过滤
        'no-console': 0,
        'no-debugger': 0,
    },
};

const merge = require('webpack-merge');
const common = require('./webpack.config.common.js');
const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = merge(common, {
    mode: 'production',
    entry: {
        index: ['./src/index.ts'],
        migrate: ['./src/utility/migrate.ts']
    },
    externals: [
        nodeExternals()
    ],
    module: {
        rules: [
            {
                test: /.tsx?$/,
                use: 'ts-loader',
                include: path.resolve(__dirname, 'src'),
                exclude: /node_modules/
            }
        ]
    },
    // devtool: 'source-map'
});

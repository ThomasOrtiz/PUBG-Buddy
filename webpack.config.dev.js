const common = require('./webpack.config.common.js');
const webpack = require('webpack');
const path = require('path');
const merge = require('webpack-merge');
const nodeExternals = require('webpack-node-externals');

module.exports = merge(common, {
    mode: 'development',
    entry: {
        index: ['webpack/hot/poll?100', './src/index.ts'],
        migrate: ['./src/utility/migrate.ts']
    },
    externals: [
        nodeExternals({
            whitelist: ['webpack/hot/poll?100']
        })
    ],
    devtool: 'inline-source-map',
    module: {
        rules: [
            {
                test: /.tsx?$/,
                include: path.resolve(__dirname, 'src'),
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            transpileOnly: true,
                            experimentalWatchApi: true,
                        },
                    }
                ]
            }
        ]
    },
    plugins: [
        new webpack.HotModuleReplacementPlugin()
    ],
    watch: true
});

const path = require('path');
const ProgressBarPlugin = require('progress-bar-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
    target: 'node',
    resolve: {
        extensions: ['.tsx', '.ts', '.js']
    },
    plugins: [
        new ProgressBarPlugin(),
        new CleanWebpackPlugin(['dist']),
        // new BundleAnalyzerPlugin()
    ],
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'dist')
    }
};

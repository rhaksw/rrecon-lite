const path = require("path");
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const WebpackZipPlugin = require('webpack-zip-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const isDev = process.env.NODE_ENV === 'dev';

const distPath = path.join(__dirname, "dist");

mini = {
  collapseWhitespace: isDev === false,
  collapseInlineTagWhitespace: isDev === false,
  removeComments: isDev === false,
  removeRedundantAttributes: isDev === false,
}

plugins = [
    new WebpackZipPlugin({
      initialFile: 'dist/chrome',
      endPath: './dist/',
      zipName: 'rrecon.zip',
    })
]

walkSync('chrome', function(filePath, stat) {
    if (filePath.match(/\.html$/)) {
      plugins.push(
        new HtmlWebpackPlugin({
          template: filePath,
          filename: filePath,
          minify: mini,
          inject: false
        }))
    }
})

module.exports = {
  mode: 'production',
  entry: {
    content: './chrome/src/content.js',
    background: './chrome/src/background.js',
    popup: './chrome/src/popup.js',
    options: './chrome/src/options.js',
    search: './chrome/src/search.js',
    'user-prompt': './chrome/src/user-prompt.js'
  },
  output: {
    path: distPath,
    filename: "./chrome/src/[name].js",
  },
  optimization: {
    minimizer: [
      new UglifyJsPlugin(
      )
    ]
  },
  plugins: plugins
}

function walkSync(currentDirPath, callback) {
    var fs = require('fs'),
        path = require('path');
    fs.readdirSync(currentDirPath).forEach(function (name) {
        var filePath = path.join(currentDirPath, name);
        var stat = fs.statSync(filePath);
        if (stat.isFile()) {
            callback(filePath, stat);
        } else if (stat.isDirectory()) {
            walkSync(filePath, callback);
        }
    });
}

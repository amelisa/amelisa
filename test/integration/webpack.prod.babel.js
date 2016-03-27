import path from 'path'
import webpack from 'webpack'

module.exports = {
  target: 'web',
  cache: false,
  context: __dirname,
  devtool: false,
  entry: {
    offline: './client/offline'
  },
  output: {
    path: __dirname + '/tmp',
    filename: '[name].js'
  },
  plugins: [
    new webpack.DefinePlugin({'process.env': {NODE_ENV: '"production"'}}),
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false
      },
      mangle: {
        keep_fnames: true
      }
    })
  ],
  module: {
    loaders: [
      {include: /\.js$/, loaders: ['babel'], exclude: /(node_modules)/},
      {include: /\.jsx$/, loaders: ['babel'], exclude: /(node_modules)/}
    ]
  },
  resolveLoader: {
    root: __dirname + '/node_modules'
  },
  resolve: {
    extensions: ['', '.js', '.jsx'],
    fallback: [path.join(__dirname, 'node_modules')],
    alias: {
      react: path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom')
    }
  },
  node: {
    __dirname: true,
    fs: 'empty'
  }
}

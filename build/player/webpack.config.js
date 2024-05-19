const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require("compression-webpack-plugin");

console.log('##', path.resolve(path.join(__dirname, '../../public')));

module.exports = {
  entry: path.resolve(__dirname, '../../public', 'player', 'app.js'),
  output: {
    path: path.resolve(__dirname, '../../public/dist'),
    filename: 'player.min.js',
    //libraryTarget: 'umd',
    library: {
      type: 'module',
    },
  },
  experiments: {
    outputModule: true,
  },
  mode: 'production',
  optimization: {
    minimizer: [new TerserPlugin()],
  },
  plugins: [
    new CompressionPlugin({
      test: /\.(js|css|html|svg)$/, // Specify which file types to compress
      filename: '[path].gz[query]', // Output filename pattern
      algorithm: 'deflate', // Use the deflate algorithm
      deleteOriginalAssets: false, // Keep the original files
    }),
  ],
};


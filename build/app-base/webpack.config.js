const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: path.resolve(__dirname, '../../public', 'app', 'base.js'),
  output: {
    path: path.resolve(__dirname, '../../public/dist'),
    filename: 'app-base.min.js',
    libraryTarget: 'umd',
  },
 
  mode: 'production',
  optimization: {
    // minimize: false,
    // minimizer: [new TerserPlugin()],
  },
  plugins: [
   
  ],
};


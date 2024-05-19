const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require("compression-webpack-plugin");

console.log('##', path.resolve(path.join(__dirname, '../../public')));

module.exports = {
	entry: path.resolve(__dirname, '../../public', 'app.js'),
	output: {
		path: path.resolve(__dirname, '../../public/dist'),
		filename: 'app.min.js',
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
		//minimizer: [new TerserPlugin()],

		minimize: true,
		minimizer: [
			new TerserPlugin({
				minify: TerserPlugin.uglifyJsMinify,
				terserOptions: {
					// comments: false,
					compress: {

						//drop_console: true,
						// drop_debugger: true,

						pure_funcs: ['console.log', 'console.debug'],
					}
				}

			})
		],
		splitChunks: {
			chunks: 'all'
		}
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


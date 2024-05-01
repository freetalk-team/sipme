const path = require('path');

const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

module.exports = {
	entry: path.resolve(__dirname, 'index.js'),
	mode: 'production',
	output: {
		filename: "[name].js",
		path: path.resolve(__dirname, '../../../public/dist'),
		publicPath: '',
		assetModuleFilename: (pathData) => {

			const filename = path.basename(pathData.filename);
			const dirname = path.dirname(pathData.filename);
			const filepath = dirname.slice(dirname.indexOf('public') + 6) + '/' + filename;
		 	console.debug(pathData.filename, '=>', filepath);

			return filepath;
			
		},
	},
	optimization: {
		minimizer: [
		  // For webpack@5 you can use the `...` syntax to extend existing minimizers (i.e. `terser-webpack-plugin`), uncomment the next line
		  // `...`,
		  new CssMinimizerPlugin(),
		],
	},
	plugins: [
		new MiniCssExtractPlugin({
			filename: "main.min.css",
		}),
	],
	module: {
		rules: [
			{
				test: /\.(svg|png|woff|woff2|eot|ttf|otf)$/, // Apply loader for font files
				type: "asset/resource",
				//generator: { filename: 'assets/[name][ext]' },
			},
			{
				test: /\.css$/,
				//use: [MiniCssExtractPlugin.loader, "css-loader"],
				use: [
					MiniCssExtractPlugin.loader,
					// {
					// 	loader: MiniCssExtractPlugin.loader,
					// 	options: {
					// 		publicPath: "/",
					// 	},
					// },
					"css-loader",
				],
			},
		
		],
	},
};

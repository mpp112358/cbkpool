const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const Dotenv = require('dotenv-webpack');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.[contenthash].js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
    ],
  },
  plugins: [
    new Dotenv(),
    new HtmlWebpackPlugin({
      template: './public/index.html',
      title: 'cbkpool - Chromebook Reservations',
    }),
    new MiniCssExtractPlugin({
      filename: 'style.[contenthash].css',
    }),
  ],
  devServer: {
    static: './dist',
    port: 3000,
    hot: true,
  },
};

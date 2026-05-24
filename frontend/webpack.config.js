import path from 'path';

import { VanillaExtractPlugin } from '@vanilla-extract/webpack-plugin';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin';
import webpack from 'webpack';

const __dirname = import.meta.dirname;

export default (_, argv) => {
  const isDev = argv.mode === 'development';

  return {
    mode: isDev ? 'development' : 'production',
    devtool: isDev ? 'eval-source-map' : 'source-map',
    entry: './src/index.tsx',
    output: {
      path: path.resolve(__dirname, 'build'),
      filename: 'bundle.js',
      publicPath: '/',
      clean: true,
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.jsx', '.js'],
      plugins: [new TsconfigPathsPlugin()],
    },
    module: {
      rules: [
        {
          // В такие файлы преобразует стили ts библиотека vanilla-extract
          test: /\.vanilla\.css$/i,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                url: false,
              },
            },
          ],
        },
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          // Можно так же использовать ts-loader без проверки типов (transpileOnly: true)
          use: 'swc-loader',
        },
      ],
    },
    plugins: [
      // Для получения доступа к переменным окружения и другим
      new webpack.DefinePlugin({
        'process.env.API_DOMAIN': JSON.stringify(
          process.env.API_DOMAIN ?? '/api',
        ),
      }),
      new HtmlWebpackPlugin({
        template: './public/index.html',
      }),

      // Для проверки типов
      new ForkTsCheckerWebpackPlugin(),

      // Для компиляции стилей
      new VanillaExtractPlugin(),
      new MiniCssExtractPlugin(),
    ],
    devServer: {
      port: 3030,
      hot: true,
      historyApiFallback: true,
    },
  };
};

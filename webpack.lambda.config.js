const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: path.resolve(__dirname, 'src', 'main.ts'),

  target: 'node',
  mode: 'production',

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'lambda.js',
    libraryTarget: 'commonjs2',
    clean: true,
  },

  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      src: path.resolve(__dirname, 'src'),
      '@': path.resolve(__dirname, 'src'),
    },
  },

  optimization: {
    minimize: false,
    usedExports: true,
    sideEffects: false,
  },

  externals: {
    'aws-sdk': 'aws-sdk',
    prisma: 'commonjs prisma',
    '@aws-sdk/client-s3': '@aws-sdk/client-s3',
    '@aws-sdk/client-dynamodb': '@aws-sdk/client-dynamodb',

    '@nestjs/websockets': '@nestjs/websockets',
    '@nestjs/microservices': '@nestjs/microservices',
    '@nestjs/websockets/socket-module': '@nestjs/websockets/socket-module',
    '@nestjs/microservices/microservices-module':
      '@nestjs/microservices/microservices-module',

    'pg-native': 'pg-native',
    sqlite3: 'sqlite3',
    mysql2: 'mysql2',
    mysql: 'mysql',
    'better-sqlite3': 'better-sqlite3',
    'pg-query-stream': 'pg-query-stream',
    oracledb: 'oracledb',
    tedious: 'tedious',
    'pg-hstore': 'pg-hstore',

    'cpu-features': 'cpu-features',
    '@mapbox/node-pre-gyp': '@mapbox/node-pre-gyp',
    encoding: 'encoding',
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              compilerOptions: {
                target: 'ES2020',
                module: 'commonjs',
                moduleResolution: 'node',
                allowSyntheticDefaultImports: true,
                esModuleInterop: true,
                skipLibCheck: true,
                emitDecoratorMetadata: true,
                experimentalDecorators: true,
                removeComments: true,
                declaration: false,
                sourceMap: false,
              },
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              [
                '@babel/preset-env',
                {
                  targets: { node: '18' },
                  modules: false,
                },
              ],
            ],
            plugins: [
              '@babel/plugin-proposal-class-properties',
              'babel-plugin-parameter-decorator',
              'babel-plugin-transform-typescript-metadata',
            ],
          },
        },
      },
    ],
  },

  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
      'process.env.IS_LAMBDA': JSON.stringify('true'),
    }),

    new webpack.IgnorePlugin({
      resourceRegExp: /^(bufferutil|utf-8-validate|supports-color)$/,
    }),

    new webpack.BannerPlugin({
      banner: '#!/usr/bin/env node',
      raw: true,
    }),

    // Copiar carpeta .prisma/client con los binarios nativos
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'node_modules/.prisma/client'),
          to: path.resolve(__dirname, 'dist/node_modules/.prisma/client'),
          noErrorOnMissing: true,
        },
        {
          from: path.resolve(__dirname, 'node_modules/@prisma/client'),
          to: path.resolve(__dirname, 'dist/node_modules/@prisma/client'),
          noErrorOnMissing: true,
        },
      ],
    }),
  ],

  performance: {
    hints: 'warning',
    maxEntrypointSize: 50 * 1024 * 1024,
    maxAssetSize: 50 * 1024 * 1024,
  },

  devtool: false,

  stats: {
    colors: true,
    modules: false,
    children: false,
    chunks: false,
    chunkModules: false,
  },
};

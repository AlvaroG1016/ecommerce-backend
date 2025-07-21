// webpack.lambda.config.js
const path = require('path');
const webpack = require('webpack');

module.exports = {
  // Punto de entrada - tu handler de Lambda
  entry: path.resolve(__dirname, 'src', 'main.ts'),

  // Configuración para Node.js (Lambda runtime)
  target: 'node',
  mode: 'production',

  // Configuración de salida
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'lambda.js',
    libraryTarget: 'commonjs2',
    clean: true, // Limpiar directorio de salida
  },

  // Resolución de módulos
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      // Alias para resolver paths relativos
      src: path.resolve(__dirname, 'src'),
      '@': path.resolve(__dirname, 'src'),
    },
  },

  // Optimizaciones para reducir tamaño
  // webpack.lambda.config.js
  optimization: {
    minimize: false, // ← Cambiar a false
    usedExports: true,
    sideEffects: false,
  },

  // Módulos externos que NO deben ser incluidos en el bundle
  externals: {
    // AWS SDK ya está disponible en el runtime de Lambda
    'aws-sdk': 'aws-sdk',
      '@prisma/client': 'commonjs @prisma/client',
  "prisma": 'commonjs prisma',
    '@aws-sdk/client-s3': '@aws-sdk/client-s3',
    '@aws-sdk/client-dynamodb': '@aws-sdk/client-dynamodb',

    // Módulos opcionales de NestJS que pueden faltar
    '@nestjs/websockets': '@nestjs/websockets',
    '@nestjs/microservices': '@nestjs/microservices',
    '@nestjs/websockets/socket-module': '@nestjs/websockets/socket-module',
    '@nestjs/microservices/microservices-module':
      '@nestjs/microservices/microservices-module',

    // Dependencias nativas que pueden causar problemas
    'pg-native': 'pg-native',
    sqlite3: 'sqlite3',
    mysql2: 'mysql2',
    mysql: 'mysql',
    'better-sqlite3': 'better-sqlite3',
    'pg-query-stream': 'pg-query-stream',
    oracledb: 'oracledb',
    tedious: 'tedious',
    'pg-hstore': 'pg-hstore',

    // Dependencias opcionales que pueden ser problemáticas
    'cpu-features': 'cpu-features',
    '@mapbox/node-pre-gyp': '@mapbox/node-pre-gyp',
    encoding: 'encoding',
  },

  // Configuración de módulos/loaders
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
                  targets: { node: '18' }, // Target Node.js 18
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

  // Plugins para optimización adicional
  plugins: [
    // Variables de entorno
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
      'process.env.IS_LAMBDA': JSON.stringify('true'),
    }),

    // Ignorar módulos opcionales problemáticos
    new webpack.IgnorePlugin({
      resourceRegExp: /^(bufferutil|utf-8-validate|supports-color)$/,
    }),

    // Banner con información
    new webpack.BannerPlugin({
      banner: '#!/usr/bin/env node',
      raw: true,
    }),
  ],

  // Configuración de performance
  performance: {
    hints: 'warning',
    maxEntrypointSize: 50 * 1024 * 1024, // 50MB
    maxAssetSize: 50 * 1024 * 1024, // 50MB
  },

  // Source maps para debugging (opcional)
  devtool: false, // Deshabilitado para reducir tamaño

  // Configuraciones adicionales
  stats: {
    colors: true,
    modules: false,
    children: false,
    chunks: false,
    chunkModules: false,
  },
};

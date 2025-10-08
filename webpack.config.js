import path from 'path'
import { fileURLToPath } from 'url'
import CopyWebpackPlugin from 'copy-webpack-plugin'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default (env, argv) => {
  const isProduction = argv.mode === 'production'

  return {
    entry: {
      'background/service-worker': './src/background/service-worker.ts',
      'content/content-script': './src/content/content-script.ts',
      'popup/popup': './src/popup/popup.ts'
    },

    output: {
      path: path.resolve(__dirname, "dist"),
      filename: '[name].js',
      clean: true,
    },

    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@/core': path.resolve(__dirname, 'src/core'),
        '@/shared': path.resolve(__dirname, 'src/shared'),
        '@/content': path.resolve(__dirname, 'src/content'),
        '@/popup': path.resolve(__dirname, 'src/popup'),
        '@/background': path.resolve(__dirname, 'src/background')
      }
    },

    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                transpileOnly: false,
                compilerOptions: {
                  noEmit: false,
                  module: 'esnext',
                  moduleResolution: 'bundler'
                }
              }
            }
          ],
          exclude: /node_modules/
        },
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/[name][ext]'
          }
        }
      ]
    },

    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'manifest.json',
            to: 'manifest.json',
            noErrorOnMissing: false
          },
          {
            from: 'src/popup/popup.html',
            to: 'popup/popup.html'
          },
          {
            from: 'assets',
            to: 'assets',
            noErrorOnMissing: true
          },
          {
            from: 'icons',
            to: 'icons',
            noErrorOnMissing: true
          }
        ]
      })
    ],

    devtool: isProduction ? false : 'cheap-module-source-map',

    optimization: {
      minimize: isProduction,
      runtimeChunk: false,
    },

    performance: {
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 500000,
      maxAssetSize: 500000
    },

    stats: {
      colors: true,
      modules: false,
      children: false,
      chunks: false,
      chunkModules: false,
      assets: true,
      entrypoints: true
    }
  }
}
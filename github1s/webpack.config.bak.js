const { resolve } = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const CopyWebpackPlugin = require("copy-webpack-plugin");

const isDev = "development" == process.env.NODE_ENV ? true : false;
const webpack = require('webpack');
/**
 * loader:
 * 1.下载
 * 2.使用配置loader
 * 
 * plugin:
 * 1.下载
 * 2.引入
 * 3.配置使用
 */

module.exports = {
  // 入口
  entry: {
    options: './src/js/options.js',
    background: './src/js/background.js',
    content: './src/js/content.js',
  },
  // 输出路径配置
  output: {
    // 输出文件名
    filename: isDev ? 'js/[name].[contenthash:7].js' : 'js/[name].js',
    // 输出文件路径
    path: resolve(__dirname, 'build')
  },
  // loader配置，将非js文件翻译成js文件
  module: {
    rules: [
      //需要匹配的文件
      // js语法检查
      {
        test: /\.(js|jsx)$/,
        // 只检查自己写的源代码，第三方的库是不用检查的
        exclude: /node_modules/,
        use: [
          {
            /**
             * 解决js代码对浏览器兼容问题
             * @babel/preset-env 基本js兼容性处理，只能转换基本语法，不能转换Promise
             * @babel/polyfill 将兼容性代码完全引入，体积大
             * core-js 按需引用
             */
            loader: 'babel-loader',

          },
          // {
          //     loader: 'eslint-loader',
          //     options: {
          //         // 自动修复eslint的错误
          //         fix: true,
          //     }
          // }
        ],
      },
      {
        //匹配css文件类型
        test: /\.css$/,
        // 使用哪个loader进行转换
        //调用loader顺序，从右至左，从下到上 依次执行
        use: [
          //创建<style>标签，将js中的样式资源进行插入，添加到<header>标签中
          // 'style-loader',
          //将js中的css单独生成css文件，替换style-loader
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              publicPath: '../',
            },
          },
          // 将css文件变成commonjs模块
          {
            loader: 'css-loader',
          },
          /**
           * postcss相关插件
           * cssnano 压缩css
           * postcss-preset-env 读取browserslist配置对css进行兼容性配置
           */
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [ //这里的插件只是这对于postcss
                  // 'autoprefixer',
                  'cssnano',
                  'postcss-preset-env',
                ]
              }
            }
          },

        ],
        exclude: /node_modules/,

      },
      {//antd样式处理
        test: /\.css$/,
        exclude: /src/,
        use: [
          { loader: "style-loader", },
          {
            loader: "css-loader",
            options: {
              importLoaders: 1
            }
          }
        ]
      },
      {
        // 处理图片资源,无法处理html中<img src='1.png'>图片
        // 需要url-loader和file-loader,url-loader依赖file-loader
        test: /\.(jpg|jpeg|png|gif|svg)$/,
        // 只有一个loader
        loader: 'url-loader',
        // loader配置
        options: {
          // 小于8kb，转换base64
          limit: 6 * 1024,
          name: 'static/images/[name].[hash:7].[ext]',
          /**
           * 现象:
           * <img src='[object object]'>
           * 原因:
           * url-loader默认使用es6模块解析，而html-loader引入图片是使用commonjs解析
           * 解决:
           * 关闭url-loader的es6解析，开启commonjs解析
           */
          esModule: false,
        },
        exclude: /node_modules/,
      },
      {
        // 处理html中<img src='1.png'>图片
        test: /\.html$/,
        use: {
          loader: 'html-loader',
        },
        exclude: /node_modules/,
      }
    ]
  },
  //plugin插件配置
  plugins: [
    // 输出目录清理
    new CleanWebpackPlugin(),
    new MiniCssExtractPlugin({
      /**
       * 解决修改css不刷新的问题
       * https://github.com/webpack-contrib/mini-css-extract-plugin/issues/34
       */
      filename: isDev ? 'css/[name].css' : 'css/[name].[contenthash:7].css',
    }),
    // new UglifyJsPlugin({
    //   exclude: /node_modules/,
    //   uglifyOptions: {
    //     compress: {
    //       drop_debugger: true,
    //       drop_console: true
    //     }
    //   }
    // }),
    //详细配置
    /**
     * 使用html-webpack-plugin
     * 功能：
     * 默认创建一个空html，自动引入打包输出的所有资源
     * 需求：
     * 需要使用有结构的html
     */
    new HtmlWebpackPlugin({
      template: './src/options.html',
      filename: 'options.html',
      favicon: './src/icons/icon160.png',
      inject: 'body',
      chunks: ['options'],
      minify: {
        collapseWhitespace: true,
        removeComments: true,
      }
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: resolve(__dirname, 'src/icons'), to: resolve(__dirname, 'build/icons') },
        { from: resolve(__dirname, 'src/manifest.json'), to: resolve(__dirname, 'build') },
      ],
    }),
  ],
  // 模式 开发模式，生产模式
  // 只会在内存中编译打包，不会有任何输出
  mode: isDev ? 'development' : 'production',
  // 生产环境自动压缩html、js、css
  // mode: 'production',
  // 开发服务器 自动化
  target: 'web',
  // 生成一个 SourceMap 文件
  devtool: isDev ? "eval-source-map" : "source-map",
  /**
   * tree shaking:去除无用代码
   * 前提:
   * 1.必须使用ES6模块化
   * 2.开启production环境
   * 在package.json中配置:
   * "sideEffects":false //所有代码都没副作用，可以进行tree shaking，可能会把css、@babel/polyfill等文件干掉
   * "slideEffects":["*.css", "*.less"]
   */
  devServer: {
    contentBase: resolve(__dirname, 'build'),
    compress: true,
    open: false,
    hot: true,
    port: 9999,
  }
}
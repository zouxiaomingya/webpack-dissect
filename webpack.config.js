const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const resolve = (...arg) => path.join(__dirname, ...arg);

module.exports = {
  entry: './src/index.js',
  mode: 'development', // 默认 production 生产环境
  // devtool: 'cheap-module-eval-source-map',
  output: {
    path: resolve('dist'),//定位，输出文件的目标路径
    filename: '[name].js', //文件名[name].js默认，也可自行配置
  },
  devServer: {
    contentBase: "./public/index.html",//本地服务器所加载的页面所在的目录
    historyApiFallback: true,//不跳转
    inline: true//实时刷新
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
  module: {
    rules: [
      {
        test: /(\.jsx|\.js)$/,
        use: {
          loader: "babel-loader"
        },
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader',],
      },
    ]
  },
  resolve: {
    // 设置别名
    alias: {
      '@': resolve('src'),
    },
    // 文件后缀补全
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },
}
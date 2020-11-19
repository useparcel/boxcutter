const webpack = require("webpack");
const path = require("path");
const merge = require("lodash.merge");

const componentConfig = {
  entry: `${__dirname}/src/index.js`,
  devtool: "source-map",
  output: {
    path: `${__dirname}/dist/`,
    libraryTarget: "commonjs2",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: {
          loader: "babel-loader",
        },
      },
    ],
  },
  resolve: {
    alias: {
      "./runner": path.resolve(__dirname, "./dist/iframe-runner"),
    },
  },
  externals: {
    react: "commonjs react",
    "react-dom": "commonjs react-dom",
  },
};

module.exports = [
  /**
   * Code injected into the iframe
   */
  {
    entry: `${__dirname}/src/preview/iframe/runner.js`,
    output: {
      path: `${__dirname}/dist/`,
      filename: "iframe-runner.js",
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /(node_modules)/,
          use: {
            loader: "babel-loader",
          },
        },
      ],
    },
  },
  /**
   * Client side build
   */
  merge({}, componentConfig, {
    target: "web",
    output: {
      filename: "browser.js",
    },
  }),
  /**
   * Server side build
   */
  merge({}, componentConfig, {
    target: "node",
    output: {
      filename: "ssr.js",
    },
    resolve: {
      alias: {
        "diff-dom": false,
      },
    },
  }),
];

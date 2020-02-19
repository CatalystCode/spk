const path = require("path");

module.exports = {
  entry: "./src/index.ts",
  target: "node",
  mode: "development",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/
      },
      {
        test: /\.(yaml|md)?$/,
        loader: "url-loader?limit=100000"
      }
    ]
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"]
  },
  output: {
    filename: "spk.js",
    path: path.resolve(__dirname, "dist")
  }
};

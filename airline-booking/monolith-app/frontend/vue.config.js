const path = require("path");

module.exports = {
  pluginOptions: {
    quasar: {
      theme: "mat",
      importAll: true
    }
  },
  configureWebpack: {
    devtool: "source-map"
  },
  transpileDependencies: [/[\\\/]node_modules[\\\/]quasar-framework[\\\/]/],
  devServer: {
    port: 8080,
    proxy: {
      // Proxy API requests to Flask backend
      '^/flights': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '^/bookings': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '^/payments': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '^/loyalty': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '^/customers': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '^/auth': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  chainWebpack: config => {
    config
      .entry("app")
      .clear()
      .add("./main.js")
      .end();
    config.resolve.alias.set("@", __dirname);
    config.resolve.alias.set(
      "variables",
      path.join(__dirname, "./styles/quasar.variables.styl")
    );
  }
};

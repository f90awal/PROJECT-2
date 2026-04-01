const { createProxyMiddleware } = require('http-proxy-middleware');

const target = process.env.GATEWAY_BASE_URL || 'https://gateway-production-7565.up.railway.app';

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target,
      changeOrigin: true,
    })
  );
};

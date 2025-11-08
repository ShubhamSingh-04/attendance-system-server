import { createProxyMiddleware } from 'http-proxy-middleware';

/**
 * Creates a configurable proxy middleware for a video stream.
 * @param {string} targetUrl - The full URL of the source stream (e.g., http://192.168.1.10:8080/video).
 * @param {string} apiPath - The API path this proxy is served from (e.g., /api/stream/room/123).
 */
const createStreamProxy = (targetUrl, apiPath) => {
  // Dynamically create the pathRewrite rule.
  const pathRewrite = {
    [`^${apiPath}`]: '', // e.g., { '^/api/stream/room/123': '' }
  };

  return createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    pathRewrite: pathRewrite,
    onError: (err, req, res) => {
      console.error(`Camera stream proxy error for ${targetUrl}:`, err.message);
      if (!res.headersSent) {
        res
          .status(502)
          .send('Bad Gateway: Could not connect to camera stream.');
      } else {
        res.end();
      }
    },
  });
};

export default createStreamProxy;

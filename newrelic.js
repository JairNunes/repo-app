'use strict';

exports.config = {
  app_name: [process.env.NEW_RELIC_APP_NAME || 'oficina-mecanica-api'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  logging: {
    level: process.env.NEW_RELIC_LOG_LEVEL || 'info',
  },
  allow_all_headers: true,
  attributes: {
    exclude: [
      'request.headers.cookie',
      'request.headers.authorization',
      'request.headers.proxyAuthorization',
      'request.headers.setCookie*',
      'request.headers.x*',
      'response.headers.cookie',
      'response.headers.authorization',
      'response.headers.proxyAuthorization',
      'response.headers.setCookie*',
      'response.headers.x*',
    ],
  },
  distributed_tracing: {
    enabled: true,
  },
  application_logging: {
    forwarding: {
      enabled: true,
    },
    local_decorating: {
      enabled: true,
    },
    metrics: {
      enabled: true,
    },
  },
  transaction_tracer: {
    record_sql: 'obfuscated',
  },
};

import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { cookieParser } from './http/cookies.js';
import { apiLimiter } from './middleware/rate-limit.js';
import { requireTrustedOrigin } from './middleware/trusted-origin.js';
import { materialRouter } from './routes/material.routes.js';
import { productRouter } from './routes/product.routes.js';
import { orderRouter } from './routes/order.routes.js';
import { meRouter } from './routes/me.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { contactRouter } from './routes/contact.routes.js';
import { exchangeRateRouter } from './routes/exchange-rate.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { installationCardRouter } from './routes/installation-card.routes.js';

/**
 * Builds the configured Express app without binding a port.
 *
 * Kept separate from `server.js` so tests can drive the real middleware stack
 * through supertest instead of booting a listener.
 */
export const createApp = () => {
  const app = express();

  if (env.trustProxy) {
    app.set('trust proxy', 1);
  }

  app.use(
    cors({
      origin: env.frontendOrigin,
      credentials: true
    })
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser);
  app.use(requireTrustedOrigin);
  app.use(apiLimiter);

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/installation-cards', installationCardRouter);
  app.use('/api/materials', materialRouter);
  app.use('/api/products', productRouter);
  app.use('/api/orders', orderRouter);
  app.use('/api/me', meRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/contact', contactRouter);
  app.use('/api/exchange-rate', exchangeRateRouter);

  // express.json() rejects bodies over the 100kb limit before any route runs.
  // Surface that as 413 rather than letting it fall through to the 500 handler.
  app.use((err, _req, res, next) => {
    if (err?.type === 'entity.too.large') {
      return res.status(413).json({ message: 'Payload too large.' });
    }
    return next(err);
  });

  app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  });

  return app;
};

export const app = createApp();

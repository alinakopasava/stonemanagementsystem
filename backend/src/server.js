import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { materialRouter } from './routes/material.routes.js';
import { orderRouter } from './routes/order.routes.js';
import { meRouter } from './routes/me.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { contactRouter } from './routes/contact.routes.js';

const app = express();

app.use(
  cors({
    origin: env.frontendOrigin,
    credentials: true
  })
);
app.use(express.json({ limit: '100kb' }));

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/materials', materialRouter);
app.use('/api/orders', orderRouter);
app.use('/api/me', meRouter);
app.use('/api/admin', adminRouter);
app.use('/api/contact', contactRouter);

// Final error guard
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error.' });
});

app.listen(env.port, () => {
  console.log(`Backend API listening on http://localhost:${env.port}`);
});

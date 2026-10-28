import express from 'express';
import { errorHandler } from '../middlewares/errorHandler';
import { notFoundHandler } from '../middlewares/notFound';
import { rejectDangerousPayload } from '../middlewares/rejectDangerousPayload';
import { requestLogger } from '../middlewares/requestLogger';
import routes from '../routes/index';

/**
 * Request lifecycle (middleware runs in registration order):
 *   requestLogger -> express.json -> rejectDangerousPayload -> /api routes -> notFound -> errorHandler
 * Any thrown error / rejected promise / next(err) jumps straight to errorHandler.
 */
const app = express();

app.use(requestLogger);
app.use(express.json());
app.use(rejectDangerousPayload);

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
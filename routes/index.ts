import { Router } from 'express';
import markController from '../modules/mark/mark.controller';
import studentController from '../modules/student/student.controller';
import userController from '../modules/user/user.controller';
import { curlResponse } from '../src/utils/response';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

router.get('/', (_req, res) => {
  res.json({ message: 'Hello World' });
});

// Register each feature module here.
curlResponse(router, '/users', userController);
curlResponse(router, '/students', studentController);
curlResponse(router, '/marks', markController);

/** Demo: an async handler that rejects. Proves the error is caught, not a process crash. */
router.get('/demo/async-error', async () => {
  await new Promise((resolve) => setTimeout(resolve, 10));
  throw new Error('Boom! Async failure inside a route');
});

export default router;
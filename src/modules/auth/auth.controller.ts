import { Router, type Request, type Response } from 'express';
import { validateBody } from '../../../middlewares/validate';
import { sendSuccess } from '../../utils/response';
import { loginDto, registerDto, type LoginDto, type RegisterDto } from './auth.dto';
import * as authService from './auth.service';

const router = Router();

router.post('/register', validateBody(registerDto), async (req: Request<unknown, unknown, RegisterDto>, res: Response) => {
  sendSuccess(res, await authService.register(req.body), 201);
});

router.post('/login', validateBody(loginDto), async (req: Request<unknown, unknown, LoginDto>, res: Response) => {
  sendSuccess(res, await authService.login(req.body));
});

export default router;

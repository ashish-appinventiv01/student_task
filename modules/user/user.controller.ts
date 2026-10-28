import { Router, type Request, type Response } from 'express';
import { paramsOf, validateBody, validateParams } from '../../middlewares/validate';
import {
  createUserDto,
  updateUserDto,
  userIdParamDto,
  type CreateUserDto,
  type UpdateUserDto,
  type UserIdParamDto,
} from './user.dto';
import * as userService from './user.service';

/**
 * Controller + router for /users. Handlers translate HTTP <-> service calls.
 * No business logic and no try/catch: thrown errors and rejected promises
 * go to the central error handler.
 */
const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  res.json({ data: await userService.findAllUsers() });
});

router.get('/:id', validateParams(userIdParamDto), async (_req: Request, res: Response) => {
  res.json({ data: await userService.findUserById(paramsOf<UserIdParamDto>(res).id) });
});

router.post('/', validateBody(createUserDto), async (req: Request<unknown, unknown, CreateUserDto>, res: Response) => {
  console.log('createUser', req.body);
  const user = await userService.createUser(req.body);

  res.status(201).json({ data: user });
});

router.patch(
  '/:id',
  validateParams(userIdParamDto),
  validateBody(updateUserDto),
  async (req: Request<unknown, unknown, UpdateUserDto>, res: Response) => {
    res.json({ data: await userService.updateUser(paramsOf<UserIdParamDto>(res).id, req.body) });
  },
);

router.delete('/:id', validateParams(userIdParamDto), async (_req: Request, res: Response) => {
  await userService.deleteUser(paramsOf<UserIdParamDto>(res).id);
  res.status(204).end();
});

export default router;
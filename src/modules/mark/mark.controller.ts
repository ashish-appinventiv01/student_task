import { Router, type Request, type Response } from 'express';
import { paramsOf, validateBody, validateParams, validateQuery } from '../../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { actorOf, requireAnyPermission } from '../../middlewares/authorize';
import { sendSuccess } from '../../utils/response';
import { idParam, type IdParam } from '../../utils/validators';
import { averagesQueryDto, updateMarkDto, type AveragesQueryDto, type UpdateMarkDto } from './mark.dto';
import * as markService from './mark.service';

const router = Router();

router.use(authenticate);

router.get(
  '/averages',
  requireAnyPermission('marks:averages:any', 'marks:averages:class'),
  validateQuery(averagesQueryDto),
  async (req: Request, res: Response) => {
    sendSuccess(res, await markService.getSubjectAverages(actorOf(req), res.locals.query as AveragesQueryDto));
  },
);

router.patch(
  '/:id',
  requireAnyPermission('marks:write:any', 'marks:write:class'),
  validateParams(idParam),
  validateBody(updateMarkDto),
  async (req: Request<unknown, unknown, UpdateMarkDto>, res: Response) => {
    sendSuccess(res, await markService.updateMark(actorOf(req), paramsOf<IdParam>(res).id, req.body));
  },
);

router.delete(
  '/:id',
  requireAnyPermission('marks:write:any', 'marks:write:class'),
  validateParams(idParam),
  async (req: Request, res: Response) => {
    await markService.deleteMark(actorOf(req), paramsOf<IdParam>(res).id);
    sendSuccess(res, undefined, 204);
  },
);

export default router;

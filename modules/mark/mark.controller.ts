import { Router, type Request, type Response } from 'express';
import { paramsOf, validateBody, validateParams, validateQuery } from '../../middlewares/validate';
import { sendSuccess } from '../../src/utils/response';
import { idParam, type IdParam } from '../../src/utils/validators';
import { averagesQueryDto, updateMarkDto, type AveragesQueryDto, type UpdateMarkDto } from './mark.dto';
import * as markService from './mark.service';

const router = Router();

router.get('/averages', validateQuery(averagesQueryDto), async (_req: Request, res: Response) => {
  sendSuccess(res, await markService.getSubjectAverages(res.locals.query as AveragesQueryDto));
});

router.patch(
  '/:id',
  validateParams(idParam),
  validateBody(updateMarkDto),
  async (req: Request<unknown, unknown, UpdateMarkDto>, res: Response) => {
    sendSuccess(res, await markService.updateMark(paramsOf<IdParam>(res).id, req.body));
  },
);

router.delete('/:id', validateParams(idParam), async (_req: Request, res: Response) => {
  await markService.deleteMark(paramsOf<IdParam>(res).id);
  sendSuccess(res, undefined, 204);
});

export default router;

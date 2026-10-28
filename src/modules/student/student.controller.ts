import { Router, type Request, type Response } from 'express';
import { env } from '../../../config/env';
import { paramsOf, validateBody, validateParams, validateQuery } from '../../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { actorOf, requireAnyPermission, requirePermission } from '../../middlewares/authorize';
import { MARKS_RATE_WINDOW_MS, createRateLimiter } from '../../middlewares/rateLimit';
import { sendSuccess } from '../../utils/response';
import { idParam, type IdParam } from '../../utils/validators';
import { createMarksDto, type CreateMarksDto } from '../mark/mark.dto';
import * as markService from '../mark/mark.service';
import {
  createStudentDto,
  listStudentsQueryDto,
  updateStudentDto,
  type CreateStudentDto,
  type ListStudentsQueryDto,
  type UpdateStudentDto,
} from './student.dto';
import * as studentService from './student.service';

const router = Router();

const marksSubmissionLimit = createRateLimiter({
  max: env.MARKS_RATE_LIMIT_MAX,
  windowMs: MARKS_RATE_WINDOW_MS,
});

router.use(authenticate);

router.get(
  '/',
  requireAnyPermission('students:read:any', 'students:read:class', 'students:read:own'),
  validateQuery(listStudentsQueryDto),
  async (req: Request, res: Response) => {
    sendSuccess(res, await studentService.listStudents(actorOf(req), res.locals.query as ListStudentsQueryDto));
  },
);

router.get(
  '/:id',
  requireAnyPermission('students:read:any', 'students:read:class', 'students:read:own'),
  validateParams(idParam),
  async (req: Request, res: Response) => {
    sendSuccess(res, await studentService.findStudent(actorOf(req), paramsOf<IdParam>(res).id));
  },
);

router.post(
  '/',
  requirePermission('students:write:any'),
  validateBody(createStudentDto),
  async (req: Request<unknown, unknown, CreateStudentDto>, res: Response) => {
    sendSuccess(res, await studentService.createStudent(req.body), 201);
  },
);

router.post(
  '/:id/marks',
  marksSubmissionLimit,
  requireAnyPermission('marks:write:any', 'marks:write:class'),
  validateParams(idParam),
  validateBody(createMarksDto),
  async (req: Request<unknown, unknown, CreateMarksDto>, res: Response) => {
    sendSuccess(res, await markService.createMarks(actorOf(req), paramsOf<IdParam>(res).id, req.body), 201);
  },
);

router.patch(
  '/:id',
  requirePermission('students:write:any'),
  validateParams(idParam),
  validateBody(updateStudentDto),
  async (req: Request<unknown, unknown, UpdateStudentDto>, res: Response) => {
    sendSuccess(res, await studentService.updateStudent(actorOf(req), paramsOf<IdParam>(res).id, req.body));
  },
);

router.delete(
  '/:id',
  requirePermission('students:write:any'),
  validateParams(idParam),
  async (req: Request, res: Response) => {
    await studentService.deleteStudent(actorOf(req), paramsOf<IdParam>(res).id);
    sendSuccess(res, undefined, 204);
  },
);

export default router;

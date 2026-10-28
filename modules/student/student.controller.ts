import { Router, type Request, type Response } from 'express';
import { paramsOf, validateBody, validateParams, validateQuery } from '../../middlewares/validate';
import { sendSuccess } from '../../src/utils/response';
import { idParam, type IdParam } from '../../src/utils/validators';
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

router.get('/', validateQuery(listStudentsQueryDto), async (_req: Request, res: Response) => {
  sendSuccess(res, await studentService.listStudents(res.locals.query as ListStudentsQueryDto));
});

router.get('/:id', validateParams(idParam), async (_req: Request, res: Response) => {
  sendSuccess(res, await studentService.findStudent(paramsOf<IdParam>(res).id));
});

router.post('/', validateBody(createStudentDto), async (req: Request<unknown, unknown, CreateStudentDto>, res: Response) => {
  sendSuccess(res, await studentService.createStudent(req.body), 201);
});

router.post(
  '/:id/marks',
  validateParams(idParam),
  validateBody(createMarksDto),
  async (req: Request<unknown, unknown, CreateMarksDto>, res: Response) => {
    sendSuccess(res, await markService.createMarks(paramsOf<IdParam>(res).id, req.body), 201);
  },
);

router.patch(
  '/:id',
  validateParams(idParam),
  validateBody(updateStudentDto),
  async (req: Request<unknown, unknown, UpdateStudentDto>, res: Response) => {
    sendSuccess(res, await studentService.updateStudent(paramsOf<IdParam>(res).id, req.body));
  },
);

router.delete('/:id', validateParams(idParam), async (_req: Request, res: Response) => {
  await studentService.deleteStudent(paramsOf<IdParam>(res).id);
  sendSuccess(res, undefined, 204);
});

export default router;

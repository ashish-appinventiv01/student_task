import { Router, type Request, type Response } from 'express';
import { validateBody } from '../../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { requirePermission } from '../../middlewares/authorize';
import { sendSuccess } from '../../utils/response';
import { studentLinkDto, teacherClassDto, type StudentLinkDto, type TeacherClassDto } from './admin.dto';
import * as adminService from './admin.service';

const router = Router();

router.use(authenticate, requirePermission('accounts:link'));

router.post(
  '/teacher-classes',
  validateBody(teacherClassDto),
  async (req: Request<unknown, unknown, TeacherClassDto>, res: Response) => {
    sendSuccess(res, await adminService.linkTeacherClass(req.body), 201);
  },
);

router.post(
  '/student-links',
  validateBody(studentLinkDto),
  async (req: Request<unknown, unknown, StudentLinkDto>, res: Response) => {
    sendSuccess(res, await adminService.linkStudentAccount(req.body), 201);
  },
);

export default router;

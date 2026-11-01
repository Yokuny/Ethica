import { Router } from 'express';
import { validBody, validParams } from '../../middlewares/validation.middleware.js';
import * as inviteController from './invite.controller.js';
import { acceptInviteSchema, inviteTokenParamSchema } from './invite.schema.js';

// Fully public — no validToken here (FND-03/AC1).
export const inviteRouter = Router();

inviteRouter.get('/:token', validParams(inviteTokenParamSchema), inviteController.peekInvite);
inviteRouter.post(
  '/:token/accept',
  validParams(inviteTokenParamSchema),
  validBody(acceptInviteSchema),
  inviteController.acceptInvite,
);

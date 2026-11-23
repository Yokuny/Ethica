import { Router } from 'express';
import { contactRateLimit } from '../../middlewares/rate-limit.middleware.js';
import { validBody } from '../../middlewares/validation.middleware.js';
import * as contactController from './contact.controller.js';
import { type ContactRouterDeps, contactMessageSchema } from './contact.schema.js';

// Public (AD-249): the Contact page is open to any visitor.
export const createContactRouter = (deps: ContactRouterDeps): Router => {
  const router = Router();
  router.post('/', contactRateLimit, validBody(contactMessageSchema), contactController.send(deps));
  return router;
};

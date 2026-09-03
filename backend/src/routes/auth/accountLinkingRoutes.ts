import { Router } from 'express';
import {
  getLinkedProviders,
  linkGoogle,
  linkPhoneRequest,
  linkPhoneVerify,
  unlinkProvider,
} from '../../controllers/auth/accountLinkingController';
import { validateRequest } from '../../middleware/zodValidationMiddleware';
import { requireAuth } from '../../middleware/authMiddleware';
import { accountLinkingLimiter } from '../../middleware/rateLimiter';
import {
  linkGoogleSchema,
  linkPhoneRequestSchema,
  linkPhoneVerifySchema,
  unlinkProviderSchema,
} from '../../validators/accountLinkingSchema';

const router = Router();

router.use(requireAuth);

router.get('/providers', getLinkedProviders);
router.post('/google', accountLinkingLimiter, validateRequest(linkGoogleSchema), linkGoogle);
router.post(
  '/phone/request',
  accountLinkingLimiter,
  validateRequest(linkPhoneRequestSchema),
  linkPhoneRequest,
);
router.post(
  '/phone/verify',
  accountLinkingLimiter,
  validateRequest(linkPhoneVerifySchema),
  linkPhoneVerify,
);
router.delete(
  '/:provider',
  accountLinkingLimiter,
  validateRequest(unlinkProviderSchema),
  unlinkProvider,
);

export default router;

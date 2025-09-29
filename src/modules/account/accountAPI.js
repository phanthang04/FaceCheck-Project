import express from 'express';
const router = express.Router();

import { login, signUp, getInfor } from './accountController.js';

router.post('/account/login', login);
router.post('/account/signUp', signUp);
router.get('/account/getInfor', getInfor)

export default router;

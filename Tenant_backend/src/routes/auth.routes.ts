import { Router } from 'express';
import { login, me } from '../services/auth.service';

export const authRouter = Router();

authRouter.post('/login', login);
authRouter.get('/me', me);

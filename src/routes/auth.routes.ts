import { Hono } from 'hono';
import { AuthController } from '../controllers/auth.controller';

const auth = new Hono();
const controller = new AuthController();

auth.post('/code/request', (c) => controller.requestCode(c));

export default auth; 
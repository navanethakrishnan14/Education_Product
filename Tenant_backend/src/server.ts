import 'dotenv/config';
import { app } from './app';

const port = Number(process.env.PORT) || 5000;

app.listen(port, () => {
  console.log('EduSphere Tenant API listening on http://localhost:' + port);
  console.log('Health check: http://localhost:' + port + '/health');
  console.log('Tenant login: http://localhost:' + port + '/api/v1/auth/login');
});

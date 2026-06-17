import 'dotenv/config';
import express, { Request, Response } from 'express';

import userRoutes from './routes/users.ts';
import organizationRoutes from './routes/organizations.ts';
import jobRoutes from './routes/jobs.ts';
import applicationRoutes from './routes/applications.ts';

const app = express();
app.use(express.json());

app.use('/users', userRoutes);
app.use('/organizations', organizationRoutes);
app.use('/jobs', jobRoutes);
app.use('/applications', applicationRoutes);

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'TalentForge API' });
});

app.listen(3000, () => console.log('Server running on port 3000'));

import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.ts';
import { Role } from '../generated/prisma/client.ts';

const router = Router();

// POST /users/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role = 'CANDIDATE' } = req.body;

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password, // hash this in production
        currentRole: role as Role,
        roles: [role as Role],
      },
    });

    res.status(201).json(user);
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Email already in use' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// PATCH /users/:id/switch-role
router.patch('/:id/switch-role', async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    const id = Number(req.params.id);

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.roles.includes(role as Role)) {
      return res.status(403).json({ error: `User does not have the ${role} role` });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { currentRole: role as Role },
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /users/:id/add-role — enables a second role for the user
router.patch('/:id/add-role', async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    const id = Number(req.params.id);

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const roles = user.roles.includes(role as Role)
      ? user.roles
      : [...user.roles, role as Role];

    const updated = await prisma.user.update({
      where: { id },
      data: { roles },
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /users/:id/applications — candidate's application history
router.get('/:id/applications', async (req: Request, res: Response) => {
  try {
    const applications = await prisma.application.findMany({
      where: { candidateId: Number(req.params.id) },
      include: {
        job: {
          include: { organization: { select: { id: true, name: true } } },
        },
      },
      orderBy: { appliedAt: 'desc' },
    });

    res.json(applications);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

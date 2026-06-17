import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.ts';
import { Role } from '../generated/prisma/enums.ts';

const router = Router();

// GET /users
router.get('/', async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, currentRole: true, roles: true, createdAt: true },
    });
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /users/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(req.params.id) },
      select: { id: true, name: true, email: true, currentRole: true, roles: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /users/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    if (!role || !['EMPLOYER', 'CANDIDATE'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Please select a role: EMPLOYER or CANDIDATE' });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password,
        currentRole: role as Role,
        roles: [role as Role],
      },
    });

    res.status(201).json({ success: true, message: 'Registration successful', user });
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(409).json({ success: false, message: 'Email already in use' });
    } else {
      res.status(500).json({ success: false, message: err.message });
    }
  }
});

// POST /users/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;

    if (!role || !['EMPLOYER', 'CANDIDATE'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Please specify a role: EMPLOYER or CANDIDATE' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.roles.includes(role as Role)) {
      const registered = user.roles.join(' and ');
      return res.status(403).json({
        success: false,
        message: `You are registered as ${registered}. Please login as ${registered}.`,
      });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { currentRole: role as Role },
      select: { id: true, name: true, email: true, currentRole: true, roles: true, createdAt: true },
    });

    res.json({ success: true, message: 'Login successful', user: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /users/:id/switch-role
router.patch('/:id/switch-role', async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    const id = Number(req.params.id);

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.roles.includes(role as Role)) {
      return res.status(403).json({ success: false, message: `You do not have the ${role} role` });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { currentRole: role as Role },
    });

    res.json({ success: true, message: `Switched to ${role} successfully`, user: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /users/:id/add-role
router.patch('/:id/add-role', async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    const id = Number(req.params.id);

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.roles.includes(role as Role)) {
      return res.status(400).json({ success: false, message: `You already have the ${role} role` });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { roles: [...user.roles, role as Role] },
    });

    res.json({ success: true, message: `${role} role added successfully`, user: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
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
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.ts';
import { MemberRole } from '../generated/prisma/client.ts';

const router = Router();

// POST /organizations
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, website, userId } = req.body;

    const org = await prisma.organization.create({
      data: {
        name,
        description,
        website,
        members: {
          create: { userId: Number(userId), memberRole: 'OWNER' },
        },
      },
      include: { members: { include: { user: { select: { id: true, name: true } } } } },
    });

    res.status(201).json(org);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /organizations
router.get('/', async (req: Request, res: Response) => {
  try {
    const orgs = await prisma.organization.findMany({
      include: { _count: { select: { members: true, jobs: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json(orgs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /organizations/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        jobs: { where: { status: 'OPEN' } },
      },
    });

    if (!org) return res.status(404).json({ error: 'Organization not found' });
    res.json(org);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /organizations/:id/members
router.post('/:id/members', async (req: Request, res: Response) => {
  try {
    const { userId, memberRole = 'MEMBER' } = req.body;

    const member = await prisma.organizationMember.create({
      data: {
        organizationId: Number(req.params.id),
        userId: Number(userId),
        memberRole: memberRole as MemberRole,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    res.status(201).json(member);
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'User is already a member' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

export default router;

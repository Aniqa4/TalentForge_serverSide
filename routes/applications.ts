import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.ts';
import { ApplicationStatus } from '../generated/prisma/client.ts';

const router = Router();

// PATCH /applications/:id/status — employer updates application status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;

    const application = await prisma.application.update({
      where: { id: Number(req.params.id) },
      data: { status: status as ApplicationStatus },
      include: {
        candidate: { select: { id: true, name: true, email: true } },
        job: { select: { title: true } },
      },
    });

    res.json(application);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

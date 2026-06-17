import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.ts';
import { JobType, JobStatus } from '../generated/prisma/client.ts';

const router = Router();

// POST /jobs
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, location, type, salaryMin, salaryMax, organizationId, postedById } = req.body;

    const job = await prisma.job.create({
      data: {
        title,
        description,
        location,
        type: type as JobType,
        salaryMin,
        salaryMax,
        organizationId: Number(organizationId),
        postedById: Number(postedById),
      },
      include: { organization: { select: { id: true, name: true } } },
    });

    res.status(201).json(job);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /jobs?type=FULL_TIME&location=Karachi
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type, location } = req.query;

    const jobs = await prisma.job.findMany({
      where: {
        status: 'OPEN',
        ...(type && { type: type as JobType }),
        ...(location && { location: { contains: location as string, mode: 'insensitive' } }),
      },
      include: {
        organization: { select: { id: true, name: true } },
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(jobs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /jobs/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        organization: true,
        postedBy: { select: { id: true, name: true } },
        _count: { select: { applications: true } },
      },
    });

    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /jobs/:id/status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;

    const job = await prisma.job.update({
      where: { id: Number(req.params.id) },
      data: { status: status as JobStatus },
    });

    res.json(job);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /jobs/:id/apply
router.post('/:id/apply', async (req: Request, res: Response) => {
  try {
    const { candidateId, coverLetter } = req.body;

    const application = await prisma.application.create({
      data: {
        jobId: Number(req.params.id),
        candidateId: Number(candidateId),
        coverLetter,
      },
      include: { job: { select: { title: true } } },
    });

    res.status(201).json(application);
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Already applied to this job' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// GET /jobs/:id/applications — employer view
router.get('/:id/applications', async (req: Request, res: Response) => {
  try {
    const applications = await prisma.application.findMany({
      where: { jobId: Number(req.params.id) },
      include: {
        candidate: { select: { id: true, name: true, email: true } },
      },
      orderBy: { appliedAt: 'desc' },
    });

    res.json(applications);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

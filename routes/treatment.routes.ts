import { Router } from 'express';
// @ts-ignore
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /treatments
router.get('/', async (req, res) => {
  try {
    const { companyId, branchId } = req.query;

    if (!branchId) {
      return res.status(400).json({ error: 'companyId o branchId requerido' });
    }

    const where: any = {};
    if (branchId) {
      where.branchId = String(branchId);
    } else {
      where.branch = { companyId: String(companyId) };
    }

    const treatments = await prisma.patientTreatment.findMany({
      where,
      include: {
        customer: true,
        product: true,
        sessions: { orderBy: { sessionNumber: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(treatments);
  } catch (err: any) {
    res.status(500).json({ error: 'Error obteniendo tratamientos' });
  }
});

// GET /treatments/:id
router.get('/:id', async (req, res) => {
  try {
    const treatment = await prisma.patientTreatment.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        product: true,
        sessions: { orderBy: { sessionNumber: 'asc' } },
      },
    });

    if (!treatment) return res.status(404).json({ error: 'Tratamiento no encontrado' });
    res.json(treatment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /treatments
router.post('/', async (req, res) => {
  const {
    branchId,
    customerId, productId,
    name, doctor, status,
    totalCost, notes,
    sessions,
  } = req.body;

  try {
    const newId = `trx-${Date.now()}`;

    const treatment = await prisma.patientTreatment.create({
      data: {
        id: newId,
        branch: { connect: { id: branchId } },
        customer: { connect: { id: customerId } },
        ...(productId ? { product: { connect: { id: productId } } } : {}),
        name,
        doctor,
        status: status || 'PENDIENTE',
        totalCost: Number(totalCost) || 0,
        notes: notes || '',
      },
    });

    if (sessions?.length > 0) {
      await prisma.treatmentSession.createMany({
        data: sessions.map((ses: any) => ({
          id: ses.id || `ses-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          treatmentId: newId,
          sessionNumber: Number(ses.sessionNumber),
          label: ses.label || `Sesión ${ses.sessionNumber}`,
          status: ses.status || 'PROGRAMADA',
          date: ses.date || null,
          time: ses.time || null,
          notes: ses.notes || null,
          isScheduled: ses.isScheduled ?? false, // ✅ CORREGIDO
        })),
      });
    }

    res.status(201).json(treatment);
  } catch (error: any) {
    console.error('ERROR POST treatment:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// PUT /treatments/:id
router.put('/:id', async (req, res) => {
  const {
    customerId, productId,
    name, doctor, status,
    totalCost, notes,
    sessions,
  } = req.body;

  try {
    
    // Eliminamos sesiones anteriores
    await prisma.treatmentSession.deleteMany({
      where: { treatmentId: req.params.id },
    });

    // Actualizamos tratamiento
    const treatment = await prisma.patientTreatment.update({
      where: { id: req.params.id },
      data: {
        customer: { connect: { id: customerId } },
        ...(productId
          ? { product: { connect: { id: productId } } }
          : { productId: null }),
        name,
        doctor,
        status,
        totalCost: Number(totalCost) || 0,
        notes: notes || '',
        updatedAt: new Date(),
      },
    });

    // Re-creamos sesiones
    if (sessions?.length > 0) {
      await prisma.treatmentSession.createMany({
        data: sessions.map((ses: any) => ({
          id: ses.id || `ses-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          treatmentId: req.params.id,
          sessionNumber: Number(ses.sessionNumber),
          label: ses.label || `Sesión ${ses.sessionNumber}`,
          status: ses.status || 'PROGRAMADA',
          date: ses.date || null,
          time: ses.time || null,
          notes: ses.notes || null,
          isScheduled: ses.isScheduled ?? false, // ✅ CORREGIDO (LA CLAVE)
        })),
      });
    }

    res.json(treatment);
  } catch (error: any) {
    console.error('ERROR PUT treatment:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// DELETE /treatments/:id
router.delete('/:id', async (req, res) => {
  try {
    await prisma.treatmentSession.deleteMany({
      where: { treatmentId: req.params.id },
    });

    await prisma.patientTreatment.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('ERROR DELETE treatment:', error.message);
    res.status(400).json({ error: error.message });
  }
});

export default router;
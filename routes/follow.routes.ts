import { Router, Request, Response } from 'express';
// @ts-ignore
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

type PrismaSessionStatus = 'PROGRAMADA' | 'REALIZADA' | 'CANCELADA' | 'REPROGRAMADA';

const isVencida = (session: { date?: string | null; status: string }): boolean => {
  if (!session.date) return false;
  if (['REALIZADA', 'CANCELADA', 'PAGADA'].includes(session.status)) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(session.date); d.setHours(0, 0, 0, 0);
  return d < today;
};

const calcProgress = (sessions: { status: string }[]): number => {
  if (!sessions.length) return 0;
  const done = sessions.filter(s => s.status === 'REALIZADA' || s.status === 'PAGADA').length;
  return Math.round((done / sessions.length) * 100);
};

const mapFollowStatus = (
  status: string,
  sessions: { status: string; date?: string | null }[]
): 'activo' | 'pendiente' | 'completado' | 'alerta' => {
  if (status === 'COMPLETADO') return 'completado';
  if (status === 'CANCELADO')  return 'alerta';
  const canceladas = sessions.filter(s => s.status === 'CANCELADA').length;
  const vencidas   = sessions.filter(s => isVencida(s)).length;
  if (canceladas >= 2 || vencidas >= 1) return 'alerta';
  if (status === 'EN_PROGRESO') return 'activo';
  return 'pendiente';
};

const buildAlert = (sessions: { status: string; date?: string | null }[]): string | null => {
  const canceladas = sessions.filter(s => s.status === 'CANCELADA').length;
  const vencidas   = sessions.filter(s => isVencida(s)).length;
  if (canceladas >= 2) return `No se ha presentado a ${canceladas} citas. Requiere contacto urgente.`;
  if (vencidas   >= 1) return `Tiene ${vencidas} sesion(es) vencida(s) sin reprogramar.`;
  return null;
};

const nextScheduled = (
  sessions: { status: string; date?: string | null; time?: string | null; label: string }[]
) =>
  sessions
    .filter(s => s.status === 'PROGRAMADA' && s.date)
    .sort((a, b) => (a.date! > b.date! ? 1 : -1))[0] ?? null;

const recalcStatus = (sessions: { status: string }[], current: string): string => {
  if (current === 'CANCELADO') return 'CANCELADO';
  if (!sessions.length) return current;
  const allDone   = sessions.every(s => ['REALIZADA', 'PAGADA'].includes(s.status));
  const anyDone   = sessions.some(s  => ['REALIZADA', 'PAGADA'].includes(s.status));
  const allCancel = sessions.every(s => s.status === 'CANCELADA');
  if (allDone)   return 'COMPLETADO';
  if (allCancel) return 'CANCELADO';
  if (anyDone)   return 'EN_PROGRESO';
  return 'PENDIENTE';
};

// ── Notas del tratamiento (texto plano con separador) ─────────────────────────
const NOTE_SEP = '\n---\n';

const parseNotes = (raw: string | null) => {
  if (!raw) return [];
  return raw.split(NOTE_SEP)
    .map(block => {
      const lines  = block.trim().split('\n');
      const header = lines[0] ?? '';
      const text   = lines.slice(1).join('\n').trim();
      const [datePart, author] = header.split(' · ');
      if (!datePart || !author || !text) return null;
      return {
        id:     `note-${datePart.replace(/\s/g, '')}-${author.slice(0, 4)}`,
        date:   datePart.trim(),
        author: author.trim(),
        text,
      };
    })
    .filter(Boolean);
};

const serializeNote = (author: string, text: string): string => {
  const date = new Date().toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  return `${date} · ${author}\n${text}`;
};

// ── Serializa una sesion exponiendo todos sus campos incluidos los trackingXxx ─
// El frontend usa buildTrackingMap() para leer estos campos planos.
const serializeSession = (s: any) => ({
  id:                 s.id,
  sessionNumber:      s.sessionNumber,
  label:              s.label,
  date:               s.date,
  time:               s.time,
  status:             s.status,
  effectiveStatus:    isVencida(s) ? 'VENCIDA' : s.status,
  notes:              s.notes,
  isScheduled:        s.isScheduled,
  // ── Tracking clinico por sesion ────────────────────────────────────────
  trackingOdontogram: s.trackingOdontogram ?? null,
  trackingPhotos:     s.trackingPhotos     ?? null,
  trackingNotes:      s.trackingNotes      ?? null,
  trackingUpdatedAt:  s.trackingUpdatedAt  ?? null,
  trackingUpdatedBy:  s.trackingUpdatedBy  ?? null,
});

// Devuelve true si la sesion tiene al menos un dato de tracking guardado
const hasTracking = (s: any): boolean =>
  !!(s.trackingOdontogram || s.trackingPhotos || s.trackingNotes);

// ─── GET /api/follow ──────────────────────────────────────────────────────────

/**
 * @swagger
 * tags:
 *   name: Follow
 *   description: Seguimiento clinico de pacientes y tratamientos
 */

/**
 * @swagger
 * /api/follow:
 *   get:
 *     summary: Lista tratamientos para el panel de seguimiento
 *     tags: [Follow]
 *     parameters:
 *       - in: query
 *         name: branchId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDIENTE, EN_PROGRESO, COMPLETADO, CANCELADO]
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de tratamientos
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { branchId, status, search } = req.query as Record<string, string>;
    if (!branchId) return res.status(400).json({ error: 'branchId es requerido' });

    const treatments = await prisma.patientTreatment.findMany({
      where: {
        branchId,
        ...(status && { status }),
        ...(search && {
          OR: [
            { name:     { contains: search } },
            { doctor:   { contains: search } },
            { customer: { name: { contains: search } } },
          ],
        }),
      },
      include: {
        customer: {
          select: { id: true, name: true, phone: true, email: true, documentNumber: true },
        },
        product:  { select: { id: true, name: true, price: true } },
        sessions: {
          orderBy: { sessionNumber: 'asc' },
          // Solo campos ligeros — no traemos base64 en la lista para no inflar el payload
          select: {
            id:                 true,
            status:             true,
            date:               true,
            time:               true,
            label:              true,
            trackingOdontogram: true,
            trackingPhotos:     true,
            trackingNotes:      true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const result = treatments.map(t => {
      const next = nextScheduled(t.sessions as any[]);
      return {
        treatmentId:      t.id,
        customerId:       t.customerId,
        customerName:     (t.customer as any).name,
        customerPhone:    (t.customer as any).phone,
        customerEmail:    (t.customer as any).email,
        customerDoc:      (t.customer as any).documentNumber,
        plan:             t.name,
        doctor:           t.doctor,
        totalCost:        t.totalCost,
        productName:      (t.product as any)?.name ?? null,
        status:           mapFollowStatus(t.status, t.sessions as any[]),
        rawStatus:        t.status,
        progress:         calcProgress(t.sessions as any[]),
        totalSessions:    t.sessions.length,
        doneSessions:     t.sessions.filter(s => ['REALIZADA', 'PAGADA'].includes(s.status)).length,
        cancelledCount:   t.sessions.filter(s => s.status === 'CANCELADA').length,
        vencidaCount:     (t.sessions as any[]).filter(s => isVencida(s)).length,
        alerta:           buildAlert(t.sessions as any[]),
        nextSession:      next ? { label: next.label, date: next.date, time: next.time } : null,
        // Cuantas sesiones tienen tracking — util para mostrar badge en la lista izquierda
        trackedSessions:  (t.sessions as any[]).filter(s => hasTracking(s)).length,
        updatedAt:        t.updatedAt,
        createdAt:        t.createdAt,
      };
    });

    return res.json(result);
  } catch (error) {
    console.error('[follow] GET /:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── GET /api/follow/:id ──────────────────────────────────────────────────────

/**
 * @swagger
 * /api/follow/{id}:
 *   get:
 *     summary: Detalle completo de un tratamiento con sesiones y tracking clinico
 *     tags: [Follow]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Detalle del tratamiento
 *       404:
 *         description: No encontrado
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const t = await prisma.patientTreatment.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        product:  { select: { id: true, name: true, price: true } },
        // Trae TODOS los campos de la sesion incluidos trackingXxx con base64
        sessions: { orderBy: { sessionNumber: 'asc' } },
      },
    });

    if (!t) return res.status(404).json({ error: 'Tratamiento no encontrado' });

    const pps = t.totalCost && t.sessions.length > 0
      ? t.totalCost / t.sessions.length
      : null;

    return res.json({
      id:              t.id,
      name:            t.name,   // alias para PatientTreatment.name
      plan:            t.name,
      description:     t.description,
      doctor:          t.doctor,
      totalCost:       t.totalCost,
      pricePerSession: pps,
      status:          mapFollowStatus(t.status, t.sessions as any[]),
      rawStatus:       t.status,
      progress:        calcProgress(t.sessions as any[]),
      createdAt:       t.createdAt,
      updatedAt:       t.updatedAt,
      alerta:          buildAlert(t.sessions as any[]),
      nextSession:     nextScheduled(t.sessions as any[]),
      customer: {
        id:       (t.customer as any).id,
        name:     (t.customer as any).name,
        phone:    (t.customer as any).phone,
        email:    (t.customer as any).email,
        document: (t.customer as any).documentNumber,
        address:  (t.customer as any).address,
        city:     (t.customer as any).city,
      },
      product:  t.product ?? null,
      // Cada sesion lleva sus campos trackingXxx; buildTrackingMap() del frontend los lee
      sessions: (t.sessions as any[]).map(serializeSession),
      notes:    parseNotes(t.notes),
      notesRaw: t.notes,
    });
  } catch (error) {
    console.error('[follow] GET /:id:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── PATCH /api/follow/:treatmentId/sessions/:sessionId/status ───────────────
// Ruta ORIGINAL — solo cambia el estado de la sesion

/**
 * @swagger
 * /api/follow/{treatmentId}/sessions/{sessionId}/status:
 *   patch:
 *     summary: Actualiza estado de una sesion y recalcula el tratamiento
 *     tags: [Follow]
 *     parameters:
 *       - in: path
 *         name: treatmentId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PROGRAMADA, REALIZADA, CANCELADA, REPROGRAMADA]
 *               notes: { type: string }
 *               date:  { type: string }
 *               time:  { type: string }
 *     responses:
 *       200:
 *         description: Sesion actualizada
 */
router.patch('/:treatmentId/sessions/:sessionId/status', async (req: Request, res: Response) => {
  try {
    const { treatmentId, sessionId } = req.params;
    const { status, notes, date, time } = req.body as {
      status: PrismaSessionStatus;
      notes?: string;
      date?:  string;
      time?:  string;
    };

    if (!status) return res.status(400).json({ error: 'status es requerido' });

    const updatedSession = await prisma.treatmentSession.update({
      where: { id: sessionId },
      data: {
        status,
        ...(notes !== undefined && { notes }),
        ...(date  !== undefined && { date }),
        ...(time  !== undefined && { time }),
        ...(status === 'REPROGRAMADA'          && { isScheduled: true }),
        ...(status === 'PROGRAMADA' && date    && { isScheduled: true }),
      },
    });

    const allSessions = await prisma.treatmentSession.findMany({
      where:  { treatmentId },
      select: { status: true },
    });
    const treatment = await prisma.patientTreatment.findUnique({
      where:  { id: treatmentId },
      select: { status: true },
    });
    const newStatus = recalcStatus(allSessions, treatment?.status ?? 'PENDIENTE');

    await prisma.patientTreatment.update({
      where: { id: treatmentId },
      data:  { status: newStatus },
    });

    return res.json({ session: updatedSession, treatmentStatus: newStatus });
  } catch (error) {
    console.error('[follow] PATCH sessions/status:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── PATCH /api/follow/:treatmentId/sessions/:sessionId ──────────────────────
// Ruta NUEVA — guarda el tracking clinico (odontograma, fotos base64, notas)
// El frontend lo llama desde handleSaveSessionTracking() en FollowView.tsx

/**
 * @swagger
 * /api/follow/{treatmentId}/sessions/{sessionId}:
 *   patch:
 *     summary: Guarda el tracking clinico de una sesion
 *     description: |
 *       Actualiza los campos de seguimiento clinico de la sesion.
 *       Solo los campos presentes en el body son modificados (patch parcial).
 *       Los campos aceptados son:
 *         - trackingOdontogram: objeto JSON con hallazgos por diente
 *         - trackingPhotos: array de fotos en base64
 *         - trackingNotes: texto libre de observaciones
 *         - trackingUpdatedAt: ISO timestamp del registro
 *         - trackingUpdatedBy: nombre del profesional que registra
 *     tags: [Follow]
 *     parameters:
 *       - in: path
 *         name: treatmentId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               trackingOdontogram:
 *                 type: object
 *               trackingPhotos:
 *                 type: array
 *               trackingNotes:
 *                 type: string
 *               trackingUpdatedAt:
 *                 type: string
 *                 format: date-time
 *               trackingUpdatedBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sesion con tracking actualizado (serializeSession)
 *       400:
 *         description: Sin campos para actualizar
 *       404:
 *         description: Sesion no encontrada en el tratamiento
 */
router.patch('/:treatmentId/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const { treatmentId, sessionId } = req.params;
    const {
      trackingOdontogram,
      trackingPhotos,
      trackingNotes,
      trackingUpdatedAt,
      trackingUpdatedBy,
    } = req.body;

    // Verificar que la sesion pertenece al tratamiento indicado
    const existing = await prisma.treatmentSession.findFirst({
      where: { id: sessionId, treatmentId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Sesion no encontrada en este tratamiento' });
    }

    // Construir payload con solo los campos presentes en el body
    const data: Record<string, unknown> = {};
    if (trackingOdontogram !== undefined) data.trackingOdontogram = trackingOdontogram;
    if (trackingPhotos     !== undefined) data.trackingPhotos     = trackingPhotos;
    if (trackingNotes      !== undefined) data.trackingNotes      = trackingNotes;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No se enviaron campos de tracking para actualizar' });
    }

    // Metadatos de auditoria: quien registro y cuando
    data.trackingUpdatedAt = trackingUpdatedAt ? new Date(trackingUpdatedAt) : new Date();
    data.trackingUpdatedBy = trackingUpdatedBy ?? 'Sistema';

    const updated = await prisma.treatmentSession.update({
      where: { id: sessionId },
      data,
    });

    // Devuelve la sesion serializada con todos sus campos trackingXxx
    return res.json(serializeSession(updated));
  } catch (error) {
    console.error('[follow] PATCH sessions/tracking:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── POST /api/follow/:treatmentId/notes ─────────────────────────────────────

/**
 * @swagger
 * /api/follow/{treatmentId}/notes:
 *   post:
 *     summary: Agrega nota clinica al tratamiento
 *     tags: [Follow]
 *     parameters:
 *       - in: path
 *         name: treatmentId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [author, text]
 *             properties:
 *               author: { type: string }
 *               text:   { type: string }
 *     responses:
 *       200:
 *         description: Nota guardada
 */
router.post('/:treatmentId/notes', async (req: Request, res: Response) => {
  try {
    const { treatmentId } = req.params;
    const { author, text } = req.body as { author: string; text: string };

    if (!author?.trim() || !text?.trim())
      return res.status(400).json({ error: 'author y text son requeridos' });

    const treatment = await prisma.patientTreatment.findUnique({
      where:  { id: treatmentId },
      select: { notes: true },
    });
    if (!treatment) return res.status(404).json({ error: 'Tratamiento no encontrado' });

    const newEntry   = serializeNote(author.trim(), text.trim());
    const updatedRaw = treatment.notes
      ? `${newEntry}${NOTE_SEP}${treatment.notes}`
      : newEntry;

    await prisma.patientTreatment.update({
      where: { id: treatmentId },
      data:  { notes: updatedRaw },
    });

    const [parsed] = parseNotes(newEntry);
    return res.json(parsed);
  } catch (error) {
    console.error('[follow] POST notes:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
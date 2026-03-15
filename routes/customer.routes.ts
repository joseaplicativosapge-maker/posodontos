import { Router, Request, Response } from 'express';
// @ts-ignore
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// ─── Tipos locales ────────────────────────────────────────────────────────────

interface ClinicalHistory {
  motivoConsulta?:            string;
  enfermedadActual?:          string;
  antecedentesMedicos?:       string;
  antecedentesOdontologicos?: string;
  examenExtraoral?:           string;
  examenIntraoral?:           string;
  diagnostico?:               string;
  planTratamiento?:           string;
  consentimientoFirmado?:     boolean;
  antSistemicosList?:         Record<string, boolean>;
  otrosAntSistemicos?:        string;
  alergiaDetalle?:            string;
  medicamentosActuales?:      string;
  habitosBruxismo?:           boolean;
  habitosFumador?:            boolean;
  habitosOnicoFagia?:         string;
  habitosOtros?:              string;
  signos?:                    { ta: string; fc: string; fr: string; temp: string };
  examenExtraoralDetalle?:    string;
  examenIntraoralDetalle?:    string;
  indiceHigiene?:             string;
  indiceGingival?:            string;
  clasificacionAngle?:        string;
  odontograma?:               Record<number, Record<string, string>>;
  diagnosticoDetalle?:        string;
  planTratamientoDetalle?:    string;
  pronóstico?:                string;
  consentimientoInformado?:   boolean;
  observacionesGenerales?:    string;
  fechaUltimaActualizacion?:  string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parsea clinicalHistory (string JSON) → objeto o null */
const parseClinical = (raw: string | null): ClinicalHistory | null => {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};

/** Serializa el objeto de historia clínica a string JSON */
const serializeClinical = (data: ClinicalHistory): string =>
  JSON.stringify({ ...data, fechaUltimaActualizacion: new Date().toISOString() });

/** Mapea un Customer de Prisma al formato que espera el frontend */
const mapCustomer = (c: any) => ({
  ...c,
  clinicalHistory: parseClinical(c.clinicalHistory),
});

// ─── GET /api/customers — Lista de clientes por compañía ─────────────────────

/**
 * @swagger
 * tags:
 *   name: Customers
 *   description: Gestión de clientes y su historia clínica
 */

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Lista todos los clientes de una compañía
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de clientes
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { companyId, search } = req.query as Record<string, string>;

    const customers = await prisma.customer.findMany({
      where: {
        ...(companyId && { companyId }),
        ...(search && {
          OR: [
            { name:           { contains: search } },
            { documentNumber: { contains: search } },
            { phone:          { contains: search } },
            { email:          { contains: search } },
          ],
        }),
      },
      orderBy: { name: 'asc' },
    });

    return res.json(customers.map(mapCustomer));
  } catch (error) {
    console.error('[customers] GET /:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── GET /api/customers/:id — Un cliente por ID ───────────────────────────────

/**
 * @swagger
 * /api/customers/{id}:
 *   get:
 *     summary: Obtiene un cliente por ID (incluye historia clínica)
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Cliente encontrado
 *       404:
 *         description: No encontrado
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: { treatments: { include: { sessions: true } } },
    });

    if (!customer) return res.status(404).json({ error: 'Cliente no encontrado' });
    return res.json(mapCustomer(customer));
  } catch (error) {
    console.error('[customers] GET /:id:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── POST /api/customers — Crear cliente ──────────────────────────────────────

/**
 * @swagger
 * /api/customers:
 *   post:
 *     summary: Crear un nuevo cliente
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, phone, companyId]
 *             properties:
 *               name:                 { type: string }
 *               phone:                { type: string }
 *               email:                { type: string }
 *               address:              { type: string }
 *               city:                 { type: string }
 *               documentType:         { type: string }
 *               documentNumber:       { type: string }
 *               fiscalResponsibility: { type: string }
 *               birthDate:            { type: string }
 *               companyId:            { type: string }
 *     responses:
 *       201:
 *         description: Cliente creado
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name, phone, email, address, city,
      documentType, documentNumber, fiscalResponsibility,
      birthDate, companyId, currentCompanyId,
    } = req.body;

    const resolvedCompanyId = companyId ?? currentCompanyId;
    if (!name || !phone || !resolvedCompanyId) {
      return res.status(400).json({ error: 'name, phone y companyId son requeridos' });
    }

    const customer = await prisma.customer.create({
      data: {
        name:                 name.toUpperCase(),
        phone,
        email:                email   || null,
        address:              address || null,
        city:                 city    || null,
        documentType:         documentType         || null,
        documentNumber:       documentNumber       || null,
        fiscalResponsibility: fiscalResponsibility || null,
        birthDate:            birthDate ? new Date(birthDate) : null,
        companyId:            resolvedCompanyId,
        points:               0,
        isActive:             true,
      },
    });

    return res.status(201).json(mapCustomer(customer));
  } catch (error: any) {
    console.error('[customers] POST /:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe un cliente con ese número de documento' });
    }
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── PUT /api/customers/:id — Actualizar cliente ──────────────────────────────

/**
 * @swagger
 * /api/customers/{id}:
 *   put:
 *     summary: Actualizar datos de un cliente (sin tocar historia clínica)
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Cliente actualizado
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const {
      name, phone, email, address, city,
      documentType, documentNumber, fiscalResponsibility,
      birthDate, isActive, points,
    } = req.body;

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        ...(name             !== undefined && { name: name.toUpperCase() }),
        ...(phone            !== undefined && { phone }),
        ...(email            !== undefined && { email }),
        ...(address          !== undefined && { address }),
        ...(city             !== undefined && { city }),
        ...(documentType     !== undefined && { documentType }),
        ...(documentNumber   !== undefined && { documentNumber }),
        ...(fiscalResponsibility !== undefined && { fiscalResponsibility }),
        ...(birthDate        !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
        ...(isActive         !== undefined && { isActive }),
        ...(points           !== undefined && { points }),
      },
    });

    return res.json(mapCustomer(customer));
  } catch (error: any) {
    console.error('[customers] PUT /:id:', error);
    if (error.code === 'P2025') return res.status(404).json({ error: 'Cliente no encontrado' });
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── PUT /api/customers/:id/clinical-history — Guardar historia clínica ──────

/**
 * @swagger
 * /api/customers/{id}/clinical-history:
 *   put:
 *     summary: Guardar o actualizar la historia clínica odontológica del paciente
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Objeto completo de historia clínica odontológica
 *             properties:
 *               motivoConsulta:            { type: string }
 *               enfermedadActual:          { type: string }
 *               antecedentesMedicos:       { type: string }
 *               antecedentesOdontologicos: { type: string }
 *               antSistemicosList:         { type: object }
 *               odontograma:               { type: object }
 *               diagnosticoDetalle:        { type: string }
 *               planTratamientoDetalle:    { type: string }
 *               consentimientoInformado:   { type: boolean }
 *     responses:
 *       200:
 *         description: Historia clínica guardada, devuelve el cliente actualizado
 *       404:
 *         description: Cliente no encontrado
 */
router.put('/:id/clinical-history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clinicalData: ClinicalHistory = req.body;

    // Verificar que el cliente existe
    const existing = await prisma.customer.findUnique({
      where:  { id },
      select: { id: true, clinicalHistory: true },
    });
    if (!existing) return res.status(404).json({ error: 'Cliente no encontrado' });

    // Merge con historia existente para no perder datos anteriores
    const previous  = parseClinical(existing.clinicalHistory);
    const merged    = { ...previous, ...clinicalData };
    const serialized = serializeClinical(merged);

    const customer = await prisma.customer.update({
      where: { id },
      data:  { clinicalHistory: serialized },
    });

    return res.json(mapCustomer(customer));
  } catch (error: any) {
    console.error('[customers] PUT /:id/clinical-history:', error);
    if (error.code === 'P2025') return res.status(404).json({ error: 'Cliente no encontrado' });
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── GET /api/customers/:id/clinical-history — Obtener historia clínica ──────

/**
 * @swagger
 * /api/customers/{id}/clinical-history:
 *   get:
 *     summary: Obtener la historia clínica odontológica de un paciente
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Historia clínica
 *       404:
 *         description: No encontrado
 */
router.get('/:id/clinical-history', async (req: Request, res: Response) => {
  try {
    const customer = await prisma.customer.findUnique({
      where:  { id: req.params.id },
      select: { id: true, name: true, documentType: true, documentNumber: true, clinicalHistory: true },
    });

    if (!customer) return res.status(404).json({ error: 'Cliente no encontrado' });

    return res.json({
      customerId:      customer.id,
      name:            customer.name,
      documentType:    customer.documentType,
      documentNumber:  customer.documentNumber,
      clinicalHistory: parseClinical(customer.clinicalHistory),
    });
  } catch (error) {
    console.error('[customers] GET /:id/clinical-history:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── DELETE /api/customers/:id/clinical-history — Borrar historia clínica ────

/**
 * @swagger
 * /api/customers/{id}/clinical-history:
 *   delete:
 *     summary: Eliminar la historia clínica de un paciente
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Historia clínica eliminada
 */
router.delete('/:id/clinical-history', async (req: Request, res: Response) => {
  try {
    await prisma.customer.update({
      where: { id: req.params.id },
      data:  { clinicalHistory: null },
    });
    return res.json({ message: 'Historia clínica eliminada' });
  } catch (error: any) {
    console.error('[customers] DELETE /:id/clinical-history:', error);
    if (error.code === 'P2025') return res.status(404).json({ error: 'Cliente no encontrado' });
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── PATCH /api/customers/:id/toggle — Activar / Desactivar ─────────────────

/**
 * @swagger
 * /api/customers/{id}/toggle:
 *   patch:
 *     summary: Activar o desactivar un cliente
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Estado actualizado
 */
router.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.customer.findUnique({
      where:  { id: req.params.id },
      select: { isActive: true },
    });
    if (!existing) return res.status(404).json({ error: 'Cliente no encontrado' });

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data:  { isActive: !existing.isActive },
    });
    return res.json(mapCustomer(customer));
  } catch (error) {
    console.error('[customers] PATCH /:id/toggle:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
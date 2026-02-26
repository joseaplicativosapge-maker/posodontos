
import { Router } from 'express';
// @ts-ignore
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * @openapi
 * /api/categories:
 *   get:
 *     summary: Obtener el catálogo de categorías del servicio.
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', async (req, res) => {
  try {
    const { companyId } = req.query;

    const categories = await prisma.category.findMany({
      where: companyId
        ? { companyId: String(companyId) }
        : undefined,
      orderBy: { name: 'asc' }
    });

    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/categories:
 *   post:
 *     summary: Crear una nueva categoría (ej. Entradas, Postres).
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', async (req, res) => {
  try {
    // aca fue: se extrae name e isActive del body para soportar envíos de objetos complejos
    const { name, isActive, companyId } = req.body;
    const category = await prisma.category.create({
      data: {
         id: `cat-${Date.now()}`, 
         name, 
         company: {
            connect: { id: companyId }
         },
         isActive: isActive !== undefined ? isActive : true 
      }
    });
    res.status(201).json(category);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/categories/{id}:
 *   put:
 *     summary: Modificar nombre de categoría.
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', async (req, res) => {
  try {
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(category);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/categories/{id}:
 *   delete:
 *     summary: Desactivar una categoría (Eliminación lógica)
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', async (req, res) => {
  try {
    // aca fue: se implementa la desactivación en lugar de borrado físico
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });
    res.json(category);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});


/**
 * @openapi
 * /api/categories:
 *   delete:
 *     summary: Premite cargar varias categoría
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 */
router.post('/bulk', async (req, res) => {
  try {
    const { categories, companyId } = req.body;

    if (!categories || !Array.isArray(categories)) {
      return res.status(400).json({ error: 'categories debe ser un array' });
    }

    const data = categories.map((cat: any) => ({
      id: `cat-${Date.now()}-${Math.random()}`,
      name: cat.name,
      isActive: cat.isActive ?? true,
      companyId: companyId
    }));

    const result = await prisma.category.createMany({
      data
    });

    res.status(201).json(result);

  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

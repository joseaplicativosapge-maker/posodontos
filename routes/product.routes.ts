
import { Router } from 'express';
// @ts-ignore
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * @openapi
 * /api/products:
 *   get:
 *     summary: Lista todos los productos con sus categorías y detalles de receta.
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: "companyId requerido" });
    }

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        companyId: String(companyId)
      },
      include: {
        category: true,
        ingredients: { include: { inventoryItem: true } },
        comboChildren: { include: { childProduct: true } },
        comboParents: { include: { parentProduct: true } },
      },
      orderBy: { name: 'asc' }
    });

    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Error obteniendo productos" });
  }
});

/**
 * @openapi
 * /api/products/categories:
 *   get:
 *     summary: Lista las categorías de servicio.
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 */
router.get('/categories', async (req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' }
  });
  res.json(categories);
});


/**
 * @openapi
 * /api/products:
 *   post:
 *     summary: Crea un nuevo servicio o producto con receta
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', async (req, res) => {
  // mira es aca: se agregan campos de promociones y contabilidad
  const { 
    id, companyId, category, name, price, cost, type, imageUrl,
    productionArea, ingredients, comboItems, requiresPreparation, 
    taxType, pucIncomeAccountId, promotionType, promotionValue 
  } = req.body;

  try {

    const product = await prisma.product.create({
      data: {
        id: `p-${Date.now()}`,
        company: {
          connect: { id: companyId || 'c1' }
        },
        category: {
          connect: { id: category }
        },
        name,
        price: Number(price),
        cost: Number(cost),
        type,
        imageUrl,
        productionArea,
        // mira es aca: persistencia de nuevos campos
        taxType,
        pucIncomeAccountId,
        promotionType,
        promotionValue: promotionValue ? Number(promotionValue) : null,
        ingredients: type === 'PREPARED' ? {
          create: (ingredients || []).map((ing: any) => ({
            inventoryItemId: ing.inventoryItemId,
            quantity: Number(ing.quantity)
          }))
        } : undefined,
        comboItems: type === 'COMBO' ? {
          create: (comboItems || []).map((ci: any) => ({
            childProductId: ci.productId,
            quantity: Number(ci.quantity)
          }))
        } : undefined
      }
    });
    res.status(201).json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/products/{id}:
 *   put:
 *     summary: Actualizar un producto existente
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', async (req, res) => {
  // mira es aca: se habilitan campos de ofertas y fiscalidad en la actualización
  const { 
    category, name, price, cost, type, imageUrl,
    productionArea, ingredients, comboItems, requiresPreparation, 
    taxType, pucIncomeAccountId, promotionType, promotionValue 
  } = req.body;

  try {

    await prisma.recipeItem.deleteMany({ where: { productId: req.params.id } });
    await prisma.comboItem.deleteMany({ where: { parentProductId: req.params.id } });

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        category: {
          connect: { id: category.id }
        },
        name,
        price: Number(price),
        cost: Number(cost),
        type,
        imageUrl,
        productionArea,
        taxType,
        pucIncomeAccountId,
        promotionType,
        promotionValue: promotionValue ? Number(promotionValue) : null,
        ingredients: type === 'PREPARED' ? {
          create: (ingredients || []).map((ing: any) => ({
            inventoryItemId: ing.inventoryItemId,
            quantity: Number(ing.quantity)
          }))
        } : undefined,
        comboItems: type === 'COMBO' ? {
          create: (comboItems || []).map((ci: any) => ({
            childProductId: ci.productId,
            quantity: Number(ci.quantity)
          }))
        } : undefined
      }
    });
    res.json(product);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

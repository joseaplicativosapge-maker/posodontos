import { Router } from 'express';
// @ts-ignore
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

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

router.get('/categories', async (req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' }
  });
  res.json(categories);
});

router.post('/', async (req, res) => {
  const { 
    companyId, category, name, price, cost,
    type, productType,
    imageUrl, productionArea, ingredients, comboItems,
    taxType, pucIncomeAccountId, promotionType, promotionValue 
  } = req.body;

  // ✅ FIX 1: usar productTypeFinal en TODO, no mezclar type y productType
  const productTypeFinal = (type || productType || '').toString().trim();
  // ✅ FIX 2: category puede llegar como string ID u objeto {id, name, ...}
  const categoryId = typeof category === 'object' ? category?.id : category;

  try {
    const newProductId = `p-${Date.now()}`;

    const product = await prisma.product.create({
      data: {
        id: newProductId,
        company: { connect: { id: companyId || 'c1' } },
        category: { connect: { id: categoryId } },
        name,
        price: Number(price),
        cost: Number(cost),
        type: productTypeFinal,
        imageUrl,
        productionArea,
        taxType,
        pucIncomeAccountId,
        promotionType,
        promotionValue: promotionValue ? Number(promotionValue) : null,
      }
    });

    // ✅ FIX 3: crear ingredientes SEPARADO del create del producto
    if (productTypeFinal === 'PREPARADO' && ingredients?.length > 0) {
      await prisma.recipeItem.createMany({
        data: ingredients.map((ing: any) => ({
          id: `ri-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          productId: newProductId,
          inventoryItemId: ing.inventoryItemId,
          quantity: Number(ing.quantity),
          recipeUnit: ing.recipeUnit ?? null
        }))
      });
    }

    // ✅ FIX 4: usar comboParents en lugar de comboItems (nombre correcto del schema)
    if (productTypeFinal === 'COMBO' && comboItems?.length > 0) {
      await prisma.comboItem.createMany({
        data: comboItems.map((ci: any) => ({
          id: `ci-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          parentProductId: newProductId,
          childProductId: ci.productId || ci.childProductId,
          quantity: Number(ci.quantity)
        }))
      });
    }

    res.status(201).json(product);
  } catch (error: any) {
    console.error('ERROR POST:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  const { 
    category, name, price, cost,
    type, productType,
    imageUrl, productionArea, ingredients, comboItems,
    taxType, pucIncomeAccountId, promotionType, promotionValue 
  } = req.body;

  // ✅ FIX 1: normalizar productType
  const productTypeFinal = (type || productType || '').toString().trim();
  // ✅ FIX 2: category puede llegar como objeto o string
  const categoryId = typeof category === 'object' ? category?.id : category;

  try {
    // ✅ FIX 3: primero borrar relaciones anteriores
    await prisma.recipeItem.deleteMany({ where: { productId: req.params.id } });
    await prisma.comboItem.deleteMany({ where: { parentProductId: req.params.id } });

    // ✅ FIX 4: actualizar el producto SIN ingredientes anidados
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        category: { connect: { id: categoryId } },
        name,
        price: Number(price),
        cost: Number(cost),
        type: productTypeFinal,
        imageUrl,
        productionArea,
        taxType,
        pucIncomeAccountId,
        promotionType,
        promotionValue: promotionValue ? Number(promotionValue) : null,
      }
    });

    // ✅ FIX 5: crear ingredientes SEPARADO del update
    if (productTypeFinal === 'PREPARADO' && ingredients?.length > 0) {
      await prisma.recipeItem.createMany({
        data: ingredients.map((ing: any) => ({
          id: `ri-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          productId: req.params.id,
          inventoryItemId: ing.inventoryItemId,
          quantity: Number(ing.quantity),
          recipeUnit: ing.recipeUnit ?? null
        }))
      });
    }

    // ✅ FIX 6: crear combos SEPARADO del update
    if (productTypeFinal === 'COMBO' && comboItems?.length > 0) {
      await prisma.comboItem.createMany({
        data: comboItems.map((ci: any) => ({
          id: `ci-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          parentProductId: req.params.id,
          childProductId: ci.productId || ci.childProductId,
          quantity: Number(ci.quantity)
        }))
      });
    }

    res.json(product);
  } catch (error: any) {
    console.error('ERROR PUT:', error.message);
    res.status(400).json({ error: error.message });
  }
});

export default router;
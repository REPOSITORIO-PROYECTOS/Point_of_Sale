import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BulkUpsertProductsDto } from './dto/bulk-upsert-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductEntity } from './product.entity';

export type ProductResponse = {
  id: string;
  name: string;
  price: number;
  openPrice?: boolean;
  cost?: number;
  categories: string[];
  stock?: number;
  minStock?: number;
  image?: string;
  barcodes?: string[];
  unit?: ProductEntity['unit'];
  quantity?: number;
  supplier?: string;
};

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function stringifyJsonArray(value: string[] | undefined): string {
  return JSON.stringify(value ?? []);
}

function mapDtoToEntity(payload: CreateProductDto | (UpdateProductDto & { id?: string })): Partial<ProductEntity> {
  return {
    ...(payload.id ? { id: payload.id } : {}),
    ...(payload.name !== undefined ? { name: payload.name } : {}),
    ...(payload.price !== undefined ? { price: payload.price } : {}),
    ...(payload.openPrice !== undefined ? { openPrice: payload.openPrice } : {}),
    ...(payload.cost !== undefined ? { cost: payload.cost } : {}),
    ...(payload.categories !== undefined ? { categories: stringifyJsonArray(payload.categories) } : {}),
    ...(payload.stock !== undefined ? { stock: payload.stock } : {}),
    ...(payload.minStock !== undefined ? { minStock: payload.minStock } : {}),
    ...(payload.image !== undefined ? { image: payload.image } : {}),
    ...(payload.barcodes !== undefined ? { barcodes: stringifyJsonArray(payload.barcodes) } : {}),
    ...(payload.unit !== undefined ? { unit: payload.unit } : {}),
    ...(payload.quantity !== undefined ? { quantity: payload.quantity } : {}),
    ...(payload.supplier !== undefined ? { supplier: payload.supplier?.trim() || null } : {}),
  };
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly repository: Repository<ProductEntity>,
  ) {}

  findAll() {
    return this.repository.find({ order: { name: 'ASC' } }).then((items) => items.map(toProductResponse));
  }

  async search(params: { q?: string; category?: string; supplier?: string; limit?: number }) {
    const limit = Math.min(Math.max(params.limit ?? 80, 1), 200);
    const qb = this.repository.createQueryBuilder('product').orderBy('product.name', 'ASC').take(limit);

    const query = params.q?.trim();
    if (query) {
      const pattern = `%${query.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(product.name) LIKE :pattern OR LOWER(product.id) LIKE :pattern OR product.barcodes LIKE :pattern OR product.categories LIKE :pattern OR LOWER(product.supplier) LIKE :pattern)',
        { pattern },
      );
    }

    const category = params.category?.trim();
    if (category) {
      qb.andWhere('product.categories LIKE :categoryPattern', {
        categoryPattern: `%"${category.replace(/"/g, '')}"%`,
      });
    }

    const supplier = params.supplier?.trim();
    if (supplier) {
      qb.andWhere('LOWER(product.supplier) = LOWER(:supplier)', { supplier });
    }

    const items = await qb.getMany();
    return items.map(toProductResponse);
  }

  async findOne(id: string) {
    const entity = await this.repository.findOne({ where: { id } });

    if (!entity) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    return toProductResponse(entity);
  }

  async findByBarcode(code: string) {
    const trimmed = code.trim();
    if (!trimmed) {
      throw new NotFoundException(`Product with barcode ${code} not found`);
    }

    const entity = await this.repository
      .createQueryBuilder('product')
      .where('product.barcodes LIKE :exactPattern', { exactPattern: `%"${trimmed.replace(/"/g, '')}"%` })
      .orderBy('product.name', 'ASC')
      .getOne();

    if (!entity) {
      throw new NotFoundException(`Product with barcode ${code} not found`);
    }

    return toProductResponse(entity);
  }

  async create(payload: CreateProductDto) {
    const existing = await this.repository.findOne({ where: { id: payload.id } });

    if (existing) {
      throw new ConflictException(`Product ${payload.id} already exists`);
    }

    const entity = this.repository.create({
      ...mapDtoToEntity(payload),
      unit: payload.unit ?? 'unidad',
    });

    const saved = await this.repository.save(entity);
    return toProductResponse(saved);
  }

  async update(id: string, payload: UpdateProductDto) {
    const entity = await this.repository.findOne({ where: { id } });

    if (!entity) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    Object.assign(entity, mapDtoToEntity(payload));
    const saved = await this.repository.save(entity);
    return toProductResponse(saved);
  }

  async remove(id: string) {
    const entity = await this.repository.findOne({ where: { id } });

    if (!entity) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    await this.repository.remove(entity);
    return { deleted: true, id };
  }

  async decrementStock(productId: string, quantity: number) {
    const entity = await this.repository.findOne({ where: { id: productId } });

    if (!entity || entity.stock == null) {
      return;
    }

    await this.adjustStock(productId, -quantity, { enforceMinimum: false });
  }

  async adjustStock(
    productId: string,
    delta: number,
    options: { allowNullStock?: boolean; enforceMinimum?: boolean } = {},
  ): Promise<{ stockBefore: number; stockAfter: number }> {
    const entity = await this.repository.findOne({ where: { id: productId } });

    if (!entity) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    if (entity.stock == null && !options.allowNullStock && delta < 0) {
      throw new BadRequestException(`Product ${productId} does not track stock`);
    }

    const stockBefore = entity.stock ?? 0;
    const stockAfter = stockBefore + delta;

    if (options.enforceMinimum !== false && stockAfter < 0) {
      throw new BadRequestException(
        `Insufficient stock for ${productId}. Available: ${stockBefore}, requested: ${Math.abs(delta)}`,
      );
    }

    entity.stock = Math.max(0, stockAfter);
    await this.repository.save(entity);

    return { stockBefore, stockAfter: entity.stock };
  }

  async bulkUpsert(payload: BulkUpsertProductsDto) {
    const { products, summaryOnly = false } = payload;
    const existingMap = new Map<string, ProductEntity>();
    const ids = products.map((product) => product.id);
    const lookupChunkSize = 500;

    for (let i = 0; i < ids.length; i += lookupChunkSize) {
      const chunkIds = ids.slice(i, i + lookupChunkSize);
      const found = await this.repository.find({ where: { id: In(chunkIds) } });
      for (const entity of found) {
        existingMap.set(entity.id, entity);
      }
    }

    const entities = products.map((product) => {
      const existing = existingMap.get(product.id);
      if (existing) {
        Object.assign(existing, mapDtoToEntity(product));
        if (product.unit) {
          existing.unit = product.unit;
        }
        return existing;
      }

      return this.repository.create({
        ...mapDtoToEntity(product),
        unit: product.unit ?? 'unidad',
      });
    });

    const saveChunkSize = 250;
    await this.repository.manager.transaction(async (manager) => {
      for (let i = 0; i < entities.length; i += saveChunkSize) {
        await manager.save(ProductEntity, entities.slice(i, i + saveChunkSize));
      }
    });

    if (summaryOnly) {
      return { count: entities.length };
    }

    return entities.map(toProductResponse);
  }

  async listCategories(): Promise<string[]> {
    const entities = await this.repository.find({ select: ['categories'] });
    const categories = new Set<string>();

    for (const entity of entities) {
      for (const category of parseJsonArray(entity.categories)) {
        const trimmed = category.trim();
        if (trimmed) {
          categories.add(trimmed);
        }
      }
    }

    return [...categories].sort((left, right) => left.localeCompare(right, 'es'));
  }

  async listSuppliers(): Promise<string[]> {
    const entities = await this.repository.find({ select: ['supplier'] });
    const suppliers = new Set<string>();

    for (const entity of entities) {
      const trimmed = entity.supplier?.trim();
      if (trimmed) {
        suppliers.add(trimmed);
      }
    }

    return [...suppliers].sort((left, right) => left.localeCompare(right, 'es'));
  }

  async increasePricesByCategory(category: string, percent: number) {
    const normalizedCategory = category.trim();
    if (!normalizedCategory) {
      throw new BadRequestException('Category is required');
    }

    if (percent <= 0) {
      throw new BadRequestException('Percent must be greater than zero');
    }

    const factor = 1 + percent / 100;
    const entities = await this.repository.find({ order: { name: 'ASC' } });
    const updated: ProductEntity[] = [];

    for (const entity of entities) {
      const matches = parseJsonArray(entity.categories).some(
        (item) => item.trim().toLowerCase() === normalizedCategory.toLowerCase(),
      );

      if (!matches) {
        continue;
      }

      entity.price = Math.round(entity.price * factor);
      if (entity.cost != null) {
        entity.cost = Math.round(entity.cost * factor);
      }

      updated.push(entity);
    }

    if (updated.length === 0) {
      throw new NotFoundException(`No products found in category "${normalizedCategory}"`);
    }

    const saved = await this.repository.save(updated);

    return {
      affectedCount: saved.length,
      category: normalizedCategory,
      percent,
      products: saved.map(toProductResponse),
    };
  }
}

function toProductResponse(entity: ProductEntity): ProductResponse {
  const categories = parseJsonArray(entity.categories);
  const barcodes = parseJsonArray(entity.barcodes);

  return {
    id: entity.id,
    name: entity.name,
    price: entity.price,
    ...(entity.openPrice ? { openPrice: true } : {}),
    ...(entity.cost != null ? { cost: entity.cost } : {}),
    categories,
    ...(entity.stock != null ? { stock: entity.stock } : {}),
    ...(entity.minStock != null ? { minStock: entity.minStock } : {}),
    ...(entity.image ? { image: entity.image } : {}),
    ...(barcodes.length > 0 ? { barcodes } : {}),
    ...(entity.unit ? { unit: entity.unit } : {}),
    ...(entity.quantity != null ? { quantity: entity.quantity } : {}),
    ...(entity.supplier ? { supplier: entity.supplier } : {}),
  };
}

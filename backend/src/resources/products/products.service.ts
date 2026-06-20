import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BulkUpsertProductsDto } from './dto/bulk-upsert-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductEntity } from './product.entity';

export type ProductResponse = {
  id: string;
  name: string;
  price: number;
  cost?: number;
  categories: string[];
  stock?: number;
  minStock?: number;
  image?: string;
  barcodes?: string[];
  unit?: ProductEntity['unit'];
  quantity?: number;
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
    ...(payload.cost !== undefined ? { cost: payload.cost } : {}),
    ...(payload.categories !== undefined ? { categories: stringifyJsonArray(payload.categories) } : {}),
    ...(payload.stock !== undefined ? { stock: payload.stock } : {}),
    ...(payload.minStock !== undefined ? { minStock: payload.minStock } : {}),
    ...(payload.image !== undefined ? { image: payload.image } : {}),
    ...(payload.barcodes !== undefined ? { barcodes: stringifyJsonArray(payload.barcodes) } : {}),
    ...(payload.unit !== undefined ? { unit: payload.unit } : {}),
    ...(payload.quantity !== undefined ? { quantity: payload.quantity } : {}),
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

    const entities = await this.repository.find({ order: { name: 'ASC' } });
    const entity = entities.find((item) => parseJsonArray(item.barcodes).includes(trimmed));

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

    entity.stock = Math.max(0, entity.stock - quantity);
    await this.repository.save(entity);
  }

  async bulkUpsert(payload: BulkUpsertProductsDto) {
    const saved: ProductEntity[] = [];

    for (const product of payload.products) {
      const existing = await this.repository.findOne({ where: { id: product.id } });
      const entity = existing
        ? Object.assign(existing, mapDtoToEntity(product))
        : this.repository.create({
            ...mapDtoToEntity(product),
            unit: product.unit ?? 'unidad',
          });

      saved.push(await this.repository.save(entity));
    }

    return saved.map(toProductResponse);
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
    ...(entity.cost != null ? { cost: entity.cost } : {}),
    categories,
    ...(entity.stock != null ? { stock: entity.stock } : {}),
    ...(entity.minStock != null ? { minStock: entity.minStock } : {}),
    ...(entity.image ? { image: entity.image } : {}),
    ...(barcodes.length > 0 ? { barcodes } : {}),
    ...(entity.unit ? { unit: entity.unit } : {}),
    ...(entity.quantity != null ? { quantity: entity.quantity } : {}),
  };
}

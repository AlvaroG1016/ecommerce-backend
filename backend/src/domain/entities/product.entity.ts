export class Product {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly description: string,
    public readonly price: number,
    public readonly stock: number,
    public readonly imageUrl: string,
    public readonly baseFee: number,
    public readonly isActive: boolean = true,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date(),
  ) {}

  // Métodos de dominio (lógica de negocio)
  
  public isAvailable(): boolean {
    return this.isActive && this.stock > 0;
  }

  public canFulfillQuantity(quantity: number): boolean {
    return this.stock >= quantity;
  }

  public calculateTotalWithFees(quantity: number = 1): number {
    return (this.price * quantity) + this.baseFee;
  }

  public reduceStock(quantity: number): Product {
    if (!this.canFulfillQuantity(quantity)) {
      throw new Error(`Insufficient stock. Available: ${this.stock}, Requested: ${quantity}`);
    }

    return new Product(
      this.id,
      this.name,
      this.description,
      this.price,
      this.stock - quantity,
      this.imageUrl,
      this.baseFee,
      this.isActive,
      this.createdAt,
      new Date(), // updatedAt
    );
  }

  public isExpensive(): boolean {
    return this.price > 1000000; // Mayor a 1 millón COP
  }

  // Factory methods
  
  static create(data: {
    name: string;
    description: string;
    price: number;
    stock: number;
    imageUrl: string;
    baseFee: number;
  }): Product {
    return new Product(
      0, // ID será asignado por la base de datos
      data.name,
      data.description,
      data.price,
      data.stock,
      data.imageUrl,
      data.baseFee,
    );
  }

  static fromPersistence(data: {
    id: number;
    name: string;
    description: string;
    price: number;
    stock: number;
    imageUrl: string;
    baseFee: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): Product {
    return new Product(
      data.id,
      data.name,
      data.description,
      data.price,
      data.stock,
      data.imageUrl,
      data.baseFee,
      data.isActive,
      data.createdAt,
      data.updatedAt,
    );
  }

  // Serialización
  
  public toPrimitive(): {
    id: number;
    name: string;
    description: string;
    price: number;
    stock: number;
    imageUrl: string;
    baseFee: number;
    isActive: boolean;
    isAvailable: boolean;
    totalWithFees: number;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      price: this.price,
      stock: this.stock,
      imageUrl: this.imageUrl,
      baseFee: this.baseFee,
      isActive: this.isActive,
      isAvailable: this.isAvailable(),
      totalWithFees: this.calculateTotalWithFees(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
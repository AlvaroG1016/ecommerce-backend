import { Product } from "../../../../src/domain/entities/product.entity";

describe('Product Entity', () => {
  let product: Product;

  beforeEach(() => {
    product = new Product(
      1,                    // id
      'iPhone 14',          // name
      'Latest iPhone',      // description
      1000000,             // price
      10,                  // stock
      'https://img.jpg',   // imageUrl
      50000,               // baseFee
      true,                // isActive
      new Date(),          // createdAt
      new Date(),          // updatedAt
    );
  });

  // Test 1: Disponibilidad
  it('should be available when active and has stock', () => {
    expect(product.isAvailable()).toBe(true);
  });

  it('should not be available when out of stock', () => {
    const outOfStockProduct = new Product(
      1, 'iPhone', 'Description', 1000000, 0, 'url', 50000, true
    );
    expect(outOfStockProduct.isAvailable()).toBe(false);
  });

  it('should not be available when inactive', () => {
    const inactiveProduct = new Product(
      1, 'iPhone', 'Description', 1000000, 10, 'url', 50000, false
    );
    expect(inactiveProduct.isAvailable()).toBe(false);
  });

  // Test 2: Stock
  it('should fulfill quantity when enough stock', () => {
    expect(product.canFulfillQuantity(5)).toBe(true);
    expect(product.canFulfillQuantity(10)).toBe(true);
  });

  it('should not fulfill quantity when insufficient stock', () => {
    expect(product.canFulfillQuantity(15)).toBe(false);
  });

  it('should reduce stock correctly', () => {
    const updatedProduct = product.reduceStock(3);
    expect(updatedProduct.stock).toBe(7);
    expect(updatedProduct.id).toBe(product.id);
  });

  it('should throw error when reducing more stock than available', () => {
    expect(() => product.reduceStock(15)).toThrow('Insufficient stock');
  });

  // Test 3: Cálculos
  it('should calculate total with fees for single item', () => {
    const total = product.calculateTotalWithFees();
    expect(total).toBe(1050000); // 1000000 + 50000
  });

  it('should calculate total with fees for multiple items', () => {
    const total = product.calculateTotalWithFees(3);
    expect(total).toBe(3050000); // (1000000 * 3) + 50000
  });

  it('should identify expensive products correctly', () => {
    expect(product.isExpensive()).toBe(false);
    
    const expensiveProduct = new Product(
      2, 'MacBook', 'Laptop', 2000000, 5, 'url', 50000
    );
    expect(expensiveProduct.isExpensive()).toBe(true);
  });

  // Test 4: Factory methods
  it('should create product correctly', () => {
    const productData = {
      name: 'iPad',
      description: 'Tablet device',
      price: 800000,
      stock: 5,
      imageUrl: 'https://ipad.jpg',
      baseFee: 30000,
    };

    const newProduct = Product.create(productData);
    expect(newProduct.name).toBe('iPad');
    expect(newProduct.stock).toBe(5);
  });

  // Test 5: Serialización
  it('should serialize to primitive correctly', () => {
    const primitive = product.toPrimitive();
    expect(primitive).toHaveProperty('id', 1);
    expect(primitive).toHaveProperty('isAvailable', true);
    expect(primitive).toHaveProperty('totalWithFees');
  });
});
export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD',
}

export enum CardBrand {
  VISA = 'VISA',
  MASTERCARD = 'MASTERCARD',
}

export class Transaction {
  constructor(
    public readonly id: number,
    public readonly customerId: number,
    public readonly productId: number,
    public readonly productAmount: number,
    public readonly baseFee: number,
    public readonly deliveryFee: number,
    public readonly totalAmount: number,
    public readonly status: TransactionStatus,
    public readonly wompiTransactionId?: string,
    public readonly wompiReference?: string,
    public readonly paymentMethod?: PaymentMethod,
    public readonly cardLastFour?: string,
    public readonly cardBrand?: CardBrand,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date(),
    public readonly completedAt?: Date,
  ) {}

  // Métodos de dominio (lógica de negocio)
  
  public isPending(): boolean {
    return this.status === TransactionStatus.PENDING;
  }

  public isCompleted(): boolean {
    return this.status === TransactionStatus.COMPLETED;
  }

  public isFailed(): boolean {
    return this.status === TransactionStatus.FAILED;
  }

  public canBeProcessed(): boolean {
    return this.isPending();
  }

  public calculateTotal(): number {
    return this.productAmount + this.baseFee + this.deliveryFee;
  }

  public isAmountValid(): boolean {
    return Math.abs(this.totalAmount - this.calculateTotal()) < 0.01;
  }

  public markAsCompleted(wompiTransactionId: string, wompiReference: string): Transaction {
    if (!this.canBeProcessed()) {
      throw new Error(`Transaction ${this.id} cannot be completed. Current status: ${this.status}`);
    }

    return new Transaction(
      this.id,
      this.customerId,
      this.productId,
      this.productAmount,
      this.baseFee,
      this.deliveryFee,
      this.totalAmount,
      TransactionStatus.COMPLETED,
      wompiTransactionId,
      wompiReference,
      this.paymentMethod,
      this.cardLastFour,
      this.cardBrand,
      this.createdAt,
      new Date(), 
      new Date(), 
    );
  }


  public markAsPending(wompiTransactionId?: string, wompiReference?: string): Transaction {
    return new Transaction(
      this.id,
      this.customerId,
      this.productId,
      this.productAmount,
      this.baseFee,
      this.deliveryFee,
      this.totalAmount,
      TransactionStatus.PENDING, 
      wompiTransactionId || this.wompiTransactionId,
      wompiReference || this.wompiReference,
      this.paymentMethod,
      this.cardLastFour,
      this.cardBrand,
      this.createdAt,
      new Date(), 
      undefined, 
    );
  }

  
  public updateProviderInfo(wompiTransactionId: string, wompiReference: string): Transaction {
    return new Transaction(
      this.id,
      this.customerId,
      this.productId,
      this.productAmount,
      this.baseFee,
      this.deliveryFee,
      this.totalAmount,
      this.status, 
      wompiTransactionId,
      wompiReference,
      this.paymentMethod,
      this.cardLastFour,
      this.cardBrand,
      this.createdAt,
      new Date(), // updatedAt
      this.completedAt,
    );
  }

  public markAsFailed(): Transaction {
    if (!this.canBeProcessed()) {
      throw new Error(`Transaction ${this.id} cannot be failed. Current status: ${this.status}`);
    }

    return new Transaction(
      this.id,
      this.customerId,
      this.productId,
      this.productAmount,
      this.baseFee,
      this.deliveryFee,
      this.totalAmount,
      TransactionStatus.FAILED,
      this.wompiTransactionId,
      this.wompiReference,
      this.paymentMethod,
      this.cardLastFour,
      this.cardBrand,
      this.createdAt,
      new Date(), // updatedAt
      undefined, // completedAt
    );
  }

  public getFormattedAmount(): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
    }).format(this.totalAmount);
  }

  
  static create(data: {
    customerId: number;
    productId: number;
    productAmount: number;
    baseFee: number;
    deliveryFee: number;
    paymentMethod?: PaymentMethod;
    cardLastFour?: string;
    cardBrand?: CardBrand;
  }): Transaction {
    const totalAmount = data.productAmount + data.baseFee + data.deliveryFee;

    if (data.productAmount <= 0) {
      throw new Error('Product amount must be greater than 0');
    }

    if (data.baseFee < 0) {
      throw new Error('Base fee cannot be negative');
    }

    if (data.deliveryFee < 0) {
      throw new Error('Delivery fee cannot be negative');
    }

    return new Transaction(
      0, 
      data.customerId,
      data.productId,
      data.productAmount,
      data.baseFee,
      data.deliveryFee,
      totalAmount,
      TransactionStatus.PENDING,
      undefined,
      undefined,
      data.paymentMethod,
      data.cardLastFour,
      data.cardBrand,
    );
  }

  static fromPersistence(data: {
    id: number;
    customerId: number;
    productId: number;
    productAmount: number;
    baseFee: number;
    deliveryFee: number;
    totalAmount: number;
    status: string;
    wompiTransactionId?: string;
    wompiReference?: string;
    paymentMethod?: string;
    cardLastFour?: string;
    cardBrand?: string;
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
  }): Transaction {
    return new Transaction(
      data.id,
      data.customerId,
      data.productId,
      data.productAmount,
      data.baseFee,
      data.deliveryFee,
      data.totalAmount,
      data.status as TransactionStatus,
      data.wompiTransactionId,
      data.wompiReference,
      data.paymentMethod as PaymentMethod,
      data.cardLastFour,
      data.cardBrand as CardBrand,
      data.createdAt,
      data.updatedAt,
      data.completedAt,
    );
  }

  // Serialización
  
  public toPrimitive() {
    return {
      id: this.id,
      customerId: this.customerId,
      productId: this.productId,
      productAmount: this.productAmount,
      baseFee: this.baseFee,
      deliveryFee: this.deliveryFee,
      totalAmount: this.totalAmount,
      formattedAmount: this.getFormattedAmount(),
      status: this.status,
      wompiTransactionId: this.wompiTransactionId,
      wompiReference: this.wompiReference,
      paymentMethod: this.paymentMethod,
      cardLastFour: this.cardLastFour,
      cardBrand: this.cardBrand,
      isPending: this.isPending(),
      isCompleted: this.isCompleted(),
      isFailed: this.isFailed(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      completedAt: this.completedAt,
    };
  }
}
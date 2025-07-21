export enum DeliveryStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  DELIVERED = 'DELIVERED',
}

export class Delivery {
  constructor(
    public readonly id: number,
    public readonly transactionId: number,
    public readonly address: string,
    public readonly city: string,
    public readonly postalCode: string,
    public readonly phone: string,
    public readonly deliveryFee: number,
    public readonly status: DeliveryStatus,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date(),
  ) {}

  
  public isPending(): boolean {
    return this.status === DeliveryStatus.PENDING;
  }

  public isAssigned(): boolean {
    return this.status === DeliveryStatus.ASSIGNED;
  }

  public isDelivered(): boolean {
    return this.status === DeliveryStatus.DELIVERED;
  }

  public canBeAssigned(): boolean {
    return this.isPending();
  }

  public canBeDelivered(): boolean {
    return this.isAssigned();
  }

  public getFullAddress(): string {
    return `${this.address}, ${this.city}${this.postalCode ? ` - ${this.postalCode}` : ''}`;
  }

  public calculateDeliveryFeeBasedOnCity(): number {
    const cityFees: Record<string, number> = {
      'bogota': 5000,
      'medellin': 7000,
      'cali': 8000,
      'barranquilla': 10000,
      'cartagena': 12000,
    };

    const normalizedCity = this.city.toLowerCase().trim();
    return cityFees[normalizedCity] || 15000; 
  }

  public markAsAssigned(): Delivery {
    if (!this.canBeAssigned()) {
      throw new Error(`Delivery ${this.id} cannot be assigned. Current status: ${this.status}`);
    }

    return new Delivery(
      this.id,
      this.transactionId,
      this.address,
      this.city,
      this.postalCode,
      this.phone,
      this.deliveryFee,
      DeliveryStatus.ASSIGNED,
      this.createdAt,
      new Date(), 
    );
  }

  public markAsDelivered(): Delivery {
    if (!this.canBeDelivered()) {
      throw new Error(`Delivery ${this.id} cannot be delivered. Current status: ${this.status}`);
    }

    return new Delivery(
      this.id,
      this.transactionId,
      this.address,
      this.city,
      this.postalCode,
      this.phone,
      this.deliveryFee,
      DeliveryStatus.DELIVERED,
      this.createdAt,
      new Date(), // updatedAt
    );
  }

  // Factory methods
  
  static create(data: {
    transactionId: number;
    address: string;
    city: string;
    postalCode?: string;
    phone: string;
  }): Delivery {
    // Validaciones de dominio
    if (!data.address.trim()) {
      throw new Error('Address is required');
    }

    if (!data.city.trim()) {
      throw new Error('City is required');
    }

    if (!data.phone.trim()) {
      throw new Error('Phone is required');
    }

    const delivery = new Delivery(
      0, // ID será asignado por la base de datos
      data.transactionId,
      data.address.trim(),
      data.city.trim(),
      data.postalCode?.trim() || '',
      data.phone.trim(),
      0, // Se calculará después
      DeliveryStatus.PENDING,
    );

    // Calcular fee basado en la ciudad
    const calculatedFee = delivery.calculateDeliveryFeeBasedOnCity();
    
    return new Delivery(
      delivery.id,
      delivery.transactionId,
      delivery.address,
      delivery.city,
      delivery.postalCode,
      delivery.phone,
      calculatedFee,
      delivery.status,
      delivery.createdAt,
      delivery.updatedAt,
    );
  }

  static fromPersistence(data: {
    id: number;
    transactionId: number;
    address: string;
    city: string;
    postalCode?: string;
    phone: string;
    deliveryFee: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): Delivery {
    return new Delivery(
      data.id,
      data.transactionId,
      data.address,
      data.city,
      data.postalCode || '',
      data.phone,
      data.deliveryFee,
      data.status as DeliveryStatus,
      data.createdAt,
      data.updatedAt,
    );
  }

  // Serialización
  
  public toPrimitive() {
    return {
      id: this.id,
      transactionId: this.transactionId,
      address: this.address,
      city: this.city,
      postalCode: this.postalCode,
      phone: this.phone,
      fullAddress: this.getFullAddress(),
      deliveryFee: this.deliveryFee,
      status: this.status,
      isPending: this.isPending(),
      isAssigned: this.isAssigned(),
      isDelivered: this.isDelivered(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
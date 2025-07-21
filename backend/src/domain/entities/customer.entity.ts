export class Customer {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly email: string,
    public readonly phone: string,
    public readonly createdAt: Date = new Date(),
  ) {}


  public isValidEmail(): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(this.email);
  }

  public isValidPhone(): boolean {
    const phoneRegex = /^\+57\s\d{3}\s\d{3}\s\d{4}$/;
    return phoneRegex.test(this.phone);
  }

  public getDisplayName(): string {
    return this.name.trim();
  }

  public getMaskedEmail(): string {
    const [username, domain] = this.email.split('@');

    if (username.length <= 2) {
      return this.email; 
    }

    const maskedUsername =
      username.charAt(0) +
      '*'.repeat(username.length - 2) +
      username.charAt(username.length - 1);
    return `${maskedUsername}@${domain}`;
  }


  static create(data: {
    name: string;
    email: string;
    phone: string;
  }): Customer {
    const customer = new Customer(
      0, 
      data.name.trim(),
      data.email.toLowerCase().trim(),
      data.phone.trim(),
    );

    if (!customer.isValidEmail()) {
      throw new Error('Invalid email format');
    }

    if (!customer.isValidPhone()) {
      throw new Error('Invalid phone format. Use: +57 XXX XXX XXXX');
    }

    if (data.name.trim().length < 2) {
      throw new Error('Name must be at least 2 characters long');
    }

    return customer;
  }

  static fromPersistence(data: {
    id: number;
    name: string;
    email: string;
    phone: string;
    createdAt: Date;
  }): Customer {
    return new Customer(
      data.id,
      data.name,
      data.email,
      data.phone,
      data.createdAt,
    );
  }


  public toPrimitive(): {
    id: number;
    name: string;
    email: string;
    phone: string;
    maskedEmail: string;
    createdAt: Date;
  } {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      phone: this.phone,
      maskedEmail: this.getMaskedEmail(),
      createdAt: this.createdAt,
    };
  }
}

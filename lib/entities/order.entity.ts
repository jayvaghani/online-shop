import { BaseEntity } from './base.entity';
import * as uuid from 'uuid';

export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export class Order extends BaseEntity {
  customerId: string;
  orderDate: string; // ISO 8601 format
  status: OrderStatus;
  totalAmount: number;
  // shippingAddress: string; // Could add more details

  constructor(
    id: string | null,
    customerId: string,
    totalAmount: number,
    status: OrderStatus = OrderStatus.PENDING
  ) {
    const orderId = id || uuid.v4();
    const orderDate = new Date().toISOString();
    // PK: CUST#<customerId>
    // SK: ORDER#<orderId> (Allows querying orders for a customer)
    // GSI1PK: ORDER (To list all orders, perhaps sorted by date)
    // GSI1SK: orderDate#<orderId> (Sortable key for all orders)
    // GSI2PK: ORDER#<orderId> (For direct lookup by order ID)
    // GSI2SK: ORDER#<orderId> (Can be same as PK or a constant like METADATA)
    super(orderId, `CUST#${customerId}`, `ORDER#${orderId}`, 'ORDER');
    this.customerId = customerId;
    this.orderDate = orderDate;
    this.status = status;
    this.totalAmount = totalAmount;
    this.GSI1PK = 'ORDER';
    this.GSI1SK = `${orderDate}#${orderId}`;
    this.GSI2PK = `ORDER#${orderId}`;
    this.GSI2SK = `ORDER#${orderId}`;
  }
} 
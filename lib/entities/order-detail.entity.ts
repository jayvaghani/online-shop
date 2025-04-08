import { BaseEntity } from './base.entity';

export class OrderDetail extends BaseEntity {
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;

  constructor(
    id: string,
    orderId: string,
    productId: string,
    productName: string,
    quantity: number,
    unitPrice: number
  ) {
    // PK: ORDER#<orderId> - For querying order details by order
    // SK: ORDERDETAIL#<id> - For unique order detail identification
    // GSI1PK: PROD#<productId> - For querying order details by product
    // GSI1SK: ORDER#<orderId> - For sorting order details by order
    // GSI2PK: ORDERDETAIL#<id> - For direct order detail access
    // GSI2SK: METADATA - Fixed value for direct access
    super(id, `ORDER#${orderId}`, `ORDERDETAIL#${id}`, 'ORDER_DETAIL');
    this.orderId = orderId;
    this.productId = productId;
    this.productName = productName;
    this.quantity = quantity;
    this.unitPrice = unitPrice;
    this.totalPrice = quantity * unitPrice;
    this.GSI1PK = `PROD#${productId}`;
    this.GSI1SK = `ORDER#${orderId}`;
    this.GSI2PK = `ORDERDETAIL#${id}`;
    this.GSI2SK = 'METADATA';
  }
} 
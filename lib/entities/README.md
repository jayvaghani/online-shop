# DynamoDB Single-Table Design Entities

This directory contains the entity classes for the DynamoDB single-table design. Each entity extends the `BaseEntity` class and implements the necessary attributes and methods for efficient data access.

## Table Structure

- **Primary Key**: `PK` (Partition Key) + `SK` (Sort Key)
- **Global Secondary Index 1**: `GSI1PK` + `GSI1SK`
- **Global Secondary Index 2**: `GSI2PK` + `GSI2SK`

## Best Practices Implementation

This design follows the DynamoDB best practices:

1. **Single Table Design (DYN-S-001)**: All entities are stored in a single table.
2. **Composite Keys (DYN-K-001)**: All entities use composite keys (PK/SK).
3. **Technical Names for Keys (DYN-K-002)**: Keys use technical names (PK, SK) with derived data.
4. **Partition and Sort Keys (DYN-K-003)**: All entities have both partition and sort keys.
5. **Overloaded Partition Keys (DYN-K-005)**: Used to model hierarchical relationships.
6. **Immutable Fields in Primary Keys (DYN-K-006)**: Only immutable fields are used in primary keys.
7. **Global Secondary Indexes (DYN-G-001)**: Only global secondary indexes are used.
8. **GSI Naming Convention (DYN-G-002)**: GSIs follow the naming convention GSI1, GSI2.
9. **Combined Fields in GSIs (DYN-G-003)**: Multiple fields are combined in a single GSI.
10. **Overloaded GSIs (DYN-G-004)**: GSIs are overloaded to support multiple access patterns.

## Entities

### BaseEntity
- Base class for all entities
- Contains common attributes: PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, type, createdAt, updatedAt

### ProductCategory
- PK: `CAT#<id>` - For direct category access
- SK: `CAT#<id>` - Same as PK for direct access
- GSI1PK: `CAT` - For listing all categories
- GSI1SK: `<name>` - For sorting categories by name

### Product
- PK: `CAT#<categoryId>` - For querying products by category
- SK: `PROD#<id>` - For unique product identification
- GSI1PK: `PROD` - For listing all products
- GSI1SK: `<name>` - For sorting products by name
- GSI2PK: `PROD#<id>` - For direct product access
- GSI2SK: `METADATA` - Fixed value for direct access

### Customer
- PK: `CUST#<id>` - For direct customer access
- SK: `CUST#<id>` - Same as PK for direct access
- GSI1PK: `CUST` - For listing all customers
- GSI1SK: `<username>` - For username-based lookups
- GSI2PK: `EMAIL#<emailAddress>` - For email-based lookups
- GSI2SK: `CUST#<id>` - For customer identification

### Order
- PK: `CUST#<customerId>` - For querying orders by customer
- SK: `ORDER#<id>` - For unique order identification
- GSI1PK: `ORDER` - For listing all orders
- GSI1SK: `<createdAt>` - For sorting orders by date
- GSI2PK: `ORDER#<id>` - For direct order access
- GSI2SK: `METADATA` - Fixed value for direct access

### OrderDetail
- PK: `ORDER#<orderId>` - For querying order details by order
- SK: `ORDERDETAIL#<id>` - For unique order detail identification
- GSI1PK: `PROD#<productId>` - For querying order details by product
- GSI1SK: `ORDER#<orderId>` - For sorting order details by order
- GSI2PK: `ORDERDETAIL#<id>` - For direct order detail access
- GSI2SK: `METADATA` - Fixed value for direct access

### Revenue
- PK: `REV#<date>` - For querying revenues by date
- SK: `REV#<id>` - For unique revenue identification
- GSI1PK: `REV` - For listing all revenues
- GSI1SK: `<date>` - For sorting revenues by date
- GSI2PK: `REV#<id>` - For direct revenue access
- GSI2SK: `METADATA` - Fixed value for direct access

## Access Patterns

### Category Operations
- Get all categories: Query GSI1 where GSI1PK = 'CAT'
- Get category by ID: GetItem with PK = 'CAT#<id>', SK = 'CAT#<id>'
- List products by category: Query with PK = 'CAT#<categoryId>'

### Product Operations
- Get all products: Query GSI1 where GSI1PK = 'PROD'
- Get product by ID: Query with PK = 'CAT#<categoryId>', SK = 'PROD#<id>' OR Query GSI2 where GSI2PK = 'PROD#<id>'
- Add/modify/remove product: Uses the same key structure

### Customer Operations
- Get customer by ID: GetItem with PK = 'CUST#<id>', SK = 'CUST#<id>'
- Get customer by username: Query GSI1 where GSI1PK = 'CUST', GSI1SK = '<username>'
- Get customer by email: Query GSI2 where GSI2PK = 'EMAIL#<emailAddress>'
- List all customers: Query GSI1 where GSI1PK = 'CUST'

### Order Operations
- Get customer orders: Query with PK = 'CUST#<customerId>', SK begins_with 'ORDER#'
- Get order details: Query with PK = 'ORDER#<orderId>', SK begins_with 'ORDERDETAIL#'
- Get order by ID: Query GSI2 where GSI2PK = 'ORDER#<id>'
- Get product orders: Query GSI1 where GSI1PK = 'PROD#<productId>'

### Revenue Operations
- Get revenue by date: Query with PK = 'REV#<date>'
- Get all revenues: Query GSI1 where GSI1PK = 'REV'
- Get revenues by date range: Query GSI1 where GSI1PK = 'REV', GSI1SK between '<startDate>' and '<endDate>'
- Get revenue by ID: Query GSI2 where GSI2PK = 'REV#<id>' 
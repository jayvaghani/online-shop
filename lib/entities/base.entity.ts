export abstract class BaseEntity {
  PK: string;  // Partition Key
  SK: string;  // Sort Key
  GSI1PK?: string;  // Global Secondary Index 1 Partition Key
  GSI1SK?: string;  // Global Secondary Index 1 Sort Key
  GSI2PK?: string;  // Global Secondary Index 2 Partition Key
  GSI2SK?: string;  // Global Secondary Index 2 Sort Key
  id: string;  // Unique identifier for the entity
  type: string;  // Entity type for filtering
  createdAt: string;
  updatedAt: string;

  constructor(id: string, PK: string, SK: string, type: string) {
    this.PK = PK;
    this.SK = SK;
    this.id = id;
    this.type = type;
    this.createdAt = new Date().toISOString();
    this.updatedAt = this.createdAt;
  }

  update(): void {
    this.updatedAt = new Date().toISOString();
  }
} 
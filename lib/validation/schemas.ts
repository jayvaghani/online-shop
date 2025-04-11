import { z } from 'zod';
import { OrderStatus } from '../entities/order.entity'; // Import enum
import { ValidationError } from '../errors/validation.error';

// --- Primitive Types ---
const nonEmptyString = z.string().trim().min(1, { message: "String cannot be empty" });
const positiveNumber = z.number().positive({ message: "Number must be positive" });
const optionalString = z.string().trim().optional();
const optionalPositiveNumber = positiveNumber.optional();

// --- Customer Schemas ---
export const CreateCustomerSchema = z.object({
  name: nonEmptyString,
  email: z.string().email({ message: "Invalid email format" }),
  address: nonEmptyString,
});

export const UpdateCustomerSchema = z.object({
  id: nonEmptyString, // ID is required from the input object
  name: optionalString,
  email: z.string().email({ message: "Invalid email format" }).optional(),
  address: optionalString,
}).refine(data => data.name || data.email || data.address, { 
    message: "At least one field (name, email, address) must be provided for update",
    path: [], // Apply refinement to the whole object
});

// --- Category Schemas ---
export const CreateCategorySchema = z.object({
    name: nonEmptyString,
    description: nonEmptyString,
});

export const UpdateCategorySchema = z.object({
    id: nonEmptyString,
    name: optionalString,
    description: optionalString,
}).refine(data => data.name || data.description, {
    message: "At least one field (name, description) must be provided for update",
    path: [],
});

// --- Product Schemas ---
export const CreateProductSchema = z.object({
    name: nonEmptyString,
    description: nonEmptyString,
    price: positiveNumber,
    weight: positiveNumber,
    categoryId: nonEmptyString,
    imageUrl: z.string().url({ message: "Invalid URL format" }),
});

export const UpdateProductSchema = z.object({
    id: nonEmptyString,
    name: optionalString,
    description: optionalString,
    price: optionalPositiveNumber,
    weight: optionalPositiveNumber,
    // categoryId update disallowed in service logic, so not included here for update validation
    imageUrl: z.string().url({ message: "Invalid URL format" }).optional(),
}).refine(data => data.name || data.description || data.price || data.weight || data.imageUrl, {
    message: "At least one field (name, description, price, weight, imageUrl) must be provided for update",
    path: [],
});

// --- Order Schemas ---

// Define Shipping Address Schema
const ShippingAddressSchema = z.object({
  street: nonEmptyString,
  city: nonEmptyString,
  postalCode: nonEmptyString,
  country: nonEmptyString, // Basic validation, could add country code list
  county: optionalString, // Added optional county field
});

const OrderDetailInputSchema = z.object({
    productId: nonEmptyString,
    quantity: z.number().int().positive({ message: "Quantity must be a positive integer" }),
});

export const CreateOrderSchema = z.object({
    details: z.array(OrderDetailInputSchema).min(1, { message: "Order must contain at least one detail item" }),
    shippingAddress: ShippingAddressSchema, // Add the shipping address schema
    userEmail: z.string().email()
});

// For updating order status
export const UpdateOrderStatusSchema = z.object({
    id: nonEmptyString,
    status: z.nativeEnum(OrderStatus, { errorMap: () => ({ message: "Invalid order status" }) })
});

// --- Utility Function for Validation ---
// Can be called at the start of service methods or Lambda handlers
export function validateInput<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
    const result = schema.safeParse(data);
    if (!result.success) {
        // Combine multiple validation errors if necessary
        const combinedMessage = result.error.errors.map(e => `${e.path.join('.')} (${e.code}): ${e.message}`).join('; ');
        throw new ValidationError(combinedMessage);
    }
    return result.data;
} 
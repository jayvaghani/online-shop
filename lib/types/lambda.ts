// Type for the imported handler functions (assuming they have name and path)
export interface LambdaHandlerFunction extends Function {
    name: string;
    path: string; // Assuming path was added correctly
}
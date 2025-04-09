export interface AppSyncEvent<TArguments = Record<string, any>, TSource = Record<string, any> | null> {
  arguments: TArguments;
  identity: any; // Replace with more specific identity type if needed (e.g., CognitoIdentity, IAMIdentity)
  source: TSource;
  request: {
    headers: Record<string, string>;
    domainName?: string;
  };
  info: {
    fieldName: string;
    parentTypeName: string;
    variables: Record<string, any>;
    selectionSetList: string[];
    selectionSetGraphQL: string;
  };
  prev?: {
    result: any;
  };
  stash?: Record<string, any>;
  version?: string;
  operation?: string; // Older versions might have this
  payload?: any; // Older versions might have this
}

export interface AppSyncResult<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    errorType?: string;
    locations?: Array<{
      line: number;
      column: number;
      sourceName?: string;
    }>;
    path?: (string | number)[];
    extensions?: Record<string, any>;
  }>;
} 
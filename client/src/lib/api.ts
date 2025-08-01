import { apiRequest } from "./queryClient";

export const api = {
  // Connections
  getConnections: async () => {
    const response = await apiRequest('GET', '/api/connections');
    return response.json();
  },
  
  createConnection: async (data: any) => {
    const response = await apiRequest('POST', '/api/connections', data);
    return response.json();
  },
  
  testConnection: async (id: string) => {
    const response = await apiRequest('POST', `/api/connections/${id}/test`);
    return response.json();
  },
  
  deleteConnection: async (id: string) => {
    const response = await apiRequest('DELETE', `/api/connections/${id}`);
    return response.json();
  },
  
  // Queries
  validateQuery: async (query: string) => {
    const response = await apiRequest('POST', '/api/query/validate', { query });
    return response.json();
  },
  
  translateQuery: async (query: string, targetType: string) => {
    const response = await apiRequest('POST', '/api/query/translate', { query, targetType });
    return response.json();
  },
  
  executeQuery: async (query: string, connectionId: string, targetType?: string) => {
    const response = await apiRequest('POST', '/api/query/execute', { query, connectionId, targetType });
    return response.json();
  },
  
  getQueryHistory: async () => {
    const response = await apiRequest('GET', '/api/query/history');
    return response.json();
  },
  
  saveQuery: async (data: any) => {
    const response = await apiRequest('POST', '/api/queries', data);
    return response.json();
  },
  
  getSavedQueries: async () => {
    const response = await apiRequest('GET', '/api/queries');
    return response.json();
  },
};

// src/services/clientService.js
import { toast } from 'react-toastify';

export const clientService = {
  // Get all clients
  async getClients(search = '') {
    try {
      const { ApperClient } = window.ApperSDK;
      const apperClient = new ApperClient({
        apperProjectId: import.meta.env.VITE_APPER_PROJECT_ID,
        apperPublicKey: import.meta.env.VITE_APPER_PUBLIC_KEY
      });

      const params = {
        fields: ["Id", "Name", "email", "address"],
      };
      
      // Add search filter if provided
      if (search) {
        params.where = [
          {
            fieldName: "Name",
            operator: "Contains",
            values: [search]
          }
        ];
      }

      const response = await apperClient.fetchRecords("client", params);
      if (!response || !response.data) {
        return [];
      }
      return response.data;
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Failed to load clients");
      return [];
    }
  },

  // Get a single client by ID
  async getClientById(clientId) {
    try {
      const { ApperClient } = window.ApperSDK;
      const apperClient = new ApperClient({
        apperProjectId: import.meta.env.VITE_APPER_PROJECT_ID,
        apperPublicKey: import.meta.env.VITE_APPER_PUBLIC_KEY
      });

      const response = await apperClient.getRecordById("client", clientId);
      if (!response || !response.data) {
        return null;
      }
      return response.data;
    } catch (error) {
      console.error(`Error fetching client with ID ${clientId}:`, error);
      toast.error("Failed to load client details");
      return null;
    }
  },

  // Create a new client
  async createClient(clientData) {
    try {
      const { ApperClient } = window.ApperSDK;
      const apperClient = new ApperClient({
        apperProjectId: import.meta.env.VITE_APPER_PROJECT_ID,
        apperPublicKey: import.meta.env.VITE_APPER_PUBLIC_KEY
      });

      // Only include updateable fields
      const updateableFields = {
        Name: clientData.name, 
        email: clientData.email,
        address: clientData.address
      };

      const params = {
        records: [updateableFields]
      };

      const response = await apperClient.createRecord("client", params);
      if (!response || !response.success) {
        throw new Error("Failed to create client");
      }
      
      return response.results[0].data;
    } catch (error) {
      console.error("Error creating client:", error);
      toast.error("Failed to create client");
      throw error;
    }
  }
};
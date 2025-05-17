// src/services/invoiceItemService.js
import { toast } from 'react-toastify';

export const invoiceItemService = {
  // Get all items for a specific invoice
  async getInvoiceItems(invoiceId) {
    try {
      const { ApperClient } = window.ApperSDK;
      const apperClient = new ApperClient({
        apperProjectId: import.meta.env.VITE_APPER_PROJECT_ID,
        apperPublicKey: import.meta.env.VITE_APPER_PUBLIC_KEY
      });

      const params = {
        fields: ["Id", "Name", "description", "quantity", "rate", "amount", "invoice"],
        where: [
          {
            fieldName: "invoice",
            operator: "ExactMatch",
            values: [invoiceId]
          }
        ]
      };

      const response = await apperClient.fetchRecords("invoice_item", params);
      if (!response || !response.data) {
        return [];
      }
      return response.data;
    } catch (error) {
      console.error(`Error fetching invoice items for invoice ${invoiceId}:`, error);
      toast.error("Failed to load invoice items");
      return [];
    }
  },

  // Create new invoice items (bulk)
  async createInvoiceItems(invoiceId, items) {
    try {
      const { ApperClient } = window.ApperSDK;
      const apperClient = new ApperClient({
        apperProjectId: import.meta.env.VITE_APPER_PROJECT_ID,
        apperPublicKey: import.meta.env.VITE_APPER_PUBLIC_KEY
      });

      // Prepare items with updateable fields only
      const itemRecords = items.map(item => ({
        Name: item.description.substring(0, 50), // Use first 50 chars of description as Name
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
        invoice: invoiceId
      }));

      const params = {
        records: itemRecords
      };

      const response = await apperClient.createRecord("invoice_item", params);
      if (!response || !response.success) {
        throw new Error("Failed to create invoice items");
      }
      
      // Get successfully created items
      const createdItems = response.results
        .filter(result => result.success)
        .map(result => result.data);
        
      return createdItems;
    } catch (error) {
      console.error("Error creating invoice items:", error);
      toast.error("Failed to create invoice items");
      throw error;
    }
  },

  // Delete all items for a specific invoice
  async deleteInvoiceItems(invoiceId) {
    try {
      const { ApperClient } = window.ApperSDK;
      const apperClient = new ApperClient({
        apperProjectId: import.meta.env.VITE_APPER_PROJECT_ID,
        apperPublicKey: import.meta.env.VITE_APPER_PUBLIC_KEY
      });

      // First, get all items for this invoice
      const items = await this.getInvoiceItems(invoiceId);
      
      if (items.length === 0) {
        return true; // No items to delete
      }
      
      // Get all item IDs
      const itemIds = items.map(item => item.Id);
      
      // Delete all items in a single call
      const params = {
        RecordIds: itemIds
      };

      const response = await apperClient.deleteRecord("invoice_item", params);
      if (!response || !response.success) {
        throw new Error("Failed to delete invoice items");
      }
      
      return true;
    } catch (error) {
      console.error(`Error deleting invoice items for invoice ${invoiceId}:`, error);
      toast.error("Failed to delete invoice items");
      throw error;
    }
  }
};
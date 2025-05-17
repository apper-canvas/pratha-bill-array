// src/services/invoiceService.js
import { toast } from 'react-toastify';

export const invoiceService = {
  // Get all invoices with optional filtering
  async getInvoices(filters = {}) {
    try {
      const { ApperClient } = window.ApperSDK;
      const apperClient = new ApperClient({
        apperProjectId: import.meta.env.VITE_APPER_PROJECT_ID,
        apperPublicKey: import.meta.env.VITE_APPER_PUBLIC_KEY
      });

      const whereConditions = [];
      if (filters.status) {
        whereConditions.push({
          fieldName: "status",
          operator: "ExactMatch",
          values: [filters.status]
        });
      }

      if (filters.clientName) {
        whereConditions.push({
          fieldName: "clientName",
          operator: "Contains",
          values: [filters.clientName]
        });
      }

      const params = {
        fields: [
          "Id", "Name", "invoiceNumber", "issueDate", "dueDate", 
          "clientName", "clientEmail", "clientAddress", "notes", 
          "subtotal", "taxRate", "taxAmount", "total", "status"
        ],
        where: whereConditions.length > 0 ? whereConditions : undefined,
        orderBy: [
          {
            field: "issueDate",
            direction: "DESC"
          }
        ]
      };

      const response = await apperClient.fetchRecords("invoice", params);
      if (!response || !response.data) {
        return [];
      }
      return response.data;
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to load invoices");
      return [];
    }
  },

  // Get a single invoice by ID
  async getInvoiceById(invoiceId) {
    try {
      const { ApperClient } = window.ApperSDK;
      const apperClient = new ApperClient({
        apperProjectId: import.meta.env.VITE_APPER_PROJECT_ID,
        apperPublicKey: import.meta.env.VITE_APPER_PUBLIC_KEY
      });

      const response = await apperClient.getRecordById("invoice", invoiceId);
      if (!response || !response.data) {
        return null;
      }
      return response.data;
    } catch (error) {
      console.error(`Error fetching invoice with ID ${invoiceId}:`, error);
      toast.error("Failed to load invoice details");
      return null;
    }
  },

  // Create a new invoice
  async createInvoice(invoiceData) {
    try {
      const { ApperClient } = window.ApperSDK;
      const apperClient = new ApperClient({
        apperProjectId: import.meta.env.VITE_APPER_PROJECT_ID,
        apperPublicKey: import.meta.env.VITE_APPER_PUBLIC_KEY
      });

      // Filter out any fields that aren't updateable
      const updateableFields = {
        Name: invoiceData.invoiceNumber, // Use invoice number as Name field
        invoiceNumber: invoiceData.invoiceNumber,
        issueDate: invoiceData.issueDate,
        dueDate: invoiceData.dueDate,
        clientName: invoiceData.clientName,
        clientEmail: invoiceData.clientEmail,
        clientAddress: invoiceData.clientAddress,
        notes: invoiceData.notes,
        subtotal: invoiceData.subtotal,
        taxRate: invoiceData.taxRate,
        taxAmount: invoiceData.taxAmount,
        total: invoiceData.total,
        status: invoiceData.status || "draft"
      };

      const params = {
        records: [updateableFields]
      };

      const response = await apperClient.createRecord("invoice", params);
      if (!response || !response.success) {
        throw new Error("Failed to create invoice");
      }
      return response.results[0].data;
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast.error("Failed to create invoice");
      throw error;
    }
  },

  // Update an existing invoice
  async updateInvoice(invoiceId, invoiceData) {
    try {
      const { ApperClient } = window.ApperSDK;
      const apperClient = new ApperClient({
        apperProjectId: import.meta.env.VITE_APPER_PROJECT_ID,
        apperPublicKey: import.meta.env.VITE_APPER_PUBLIC_KEY
      });

      // Filter out any fields that aren't updateable
      const updateableFields = {
        Id: invoiceId,
        Name: invoiceData.invoiceNumber, // Use invoice number as Name field
        invoiceNumber: invoiceData.invoiceNumber,
        issueDate: invoiceData.issueDate,
        dueDate: invoiceData.dueDate,
        clientName: invoiceData.clientName,
        clientEmail: invoiceData.clientEmail,
        clientAddress: invoiceData.clientAddress,
        notes: invoiceData.notes,
        subtotal: invoiceData.subtotal,
        taxRate: invoiceData.taxRate,
        taxAmount: invoiceData.taxAmount,
        total: invoiceData.total,
        status: invoiceData.status
      };

      const params = {
        records: [updateableFields]
      };

      const response = await apperClient.updateRecord("invoice", params);
      return response.results[0].data;
    } catch (error) {
      console.error(`Error updating invoice with ID ${invoiceId}:`, error);
      toast.error("Failed to update invoice");
      throw error;
    }
  },

  // Delete an invoice
  async deleteInvoice(invoiceId) {
    try {
      const { ApperClient } = window.ApperSDK;
      const apperClient = new ApperClient({
        apperProjectId: import.meta.env.VITE_APPER_PROJECT_ID,
        apperPublicKey: import.meta.env.VITE_APPER_PUBLIC_KEY
      });

      const params = {
        RecordIds: [invoiceId]
      };

      const response = await apperClient.deleteRecord("invoice", params);
      if (!response || !response.success) {
        throw new Error("Failed to delete invoice");
      }
      return true;
    } catch (error) {
      console.error(`Error deleting invoice with ID ${invoiceId}:`, error);
      toast.error("Failed to delete invoice");
      throw error;
    }
  }
};
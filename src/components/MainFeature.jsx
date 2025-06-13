import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getIcon } from '../utils/iconUtils';
import { invoiceService } from '../services/invoiceService';
import { invoiceItemService } from '../services/invoiceItemService';

function MainFeature({ toast }) {
  // Icons
  const LoadingSpinner = getIcon('Loader');
  const AlertIcon = getIcon('AlertCircle');
  const FileEditIcon = getIcon('FileEdit');
  const PlusIcon = getIcon('Plus');
  const TrashIcon = getIcon('Trash');
  const SendIcon = getIcon('Send');
  const SaveIcon = getIcon('Save');
  const CheckCircleIcon = getIcon('CheckCircle');
  const XCircleIcon = getIcon('XCircle');
  
  // Invoice form state
  const [invoice, setInvoice] = useState({
    invoiceNumber: '',
    issueDate: '',
    dueDate: '',
    clientName: '',
    clientEmail: '',
    clientAddress: '',
    items: [{ description: '', quantity: 1, rate: 0, amount: 0 }],
    notes: '',
    subtotal: 0,
    taxRate: 18, // Default GST rate in India
    taxAmount: 0,
    total: 0
  });

  // List of saved invoices
  const [invoices, setInvoices] = useState([]);
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentInvoiceId, setCurrentInvoiceId] = useState(null);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  
  // Fetch all invoices on component mount
  useEffect(() => {
    async function fetchInvoices() {
      try {
        setIsLoading(true);
        setApiError('');
        const data = await invoiceService.getInvoices();
        setInvoices(data);
      } catch (error) {
        console.error("Error fetching invoices:", error);
        setApiError('Failed to load invoices. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }
    
    if (viewMode === 'list') {
      fetchInvoices();
    }
  }, [viewMode]);
  
  // Generate invoice number when creating a new invoice
  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const invoiceCount = (invoices.length + 1).toString().padStart(3, '0');
    return `INV-${year}${month}-${invoiceCount}`;
  };
  const [viewMode, setViewMode] = useState('list'); // 'list', 'create', 'detail'
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Calculate item amount and invoice totals
  useEffect(() => {
    let newItems = [...invoice.items];
    let subtotal = 0;
    
    newItems = newItems.map(item => {
      const quantity = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const amount = quantity * rate;
      subtotal += amount;
      return { ...item, amount };
    });
    
    const taxAmount = (subtotal * (invoice.taxRate / 100)) || 0;
    const total = subtotal + taxAmount;
    
    setInvoice({
      ...invoice,
      items: newItems,
      subtotal,
      taxAmount,
      total
    });
  }, [invoice.items, invoice.taxRate]);

  // Generate unique invoice number
  useEffect(() => {
    if (viewMode === 'create' && !isEditing && !invoice.invoiceNumber) {
      setInvoice(prev => ({ ...prev, invoiceNumber: generateInvoiceNumber() }));
    }
  }, [viewMode]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setInvoice({ ...invoice, [name]: value });
    
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };
  
  // Initialize new invoice with defaults
  const initializeNewInvoice = () => {
    const today = new Date();
    const dueDate = new Date();
    dueDate.setDate(today.getDate() + 30);
    
    setInvoice({
      invoiceNumber: generateInvoiceNumber(),
      issueDate: today.toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
      clientName: '',
      clientEmail: '',
      clientAddress: '',
      items: [{ description: '', quantity: 1, rate: 0, amount: 0 }],
      notes: '',
      subtotal: 0,
      taxRate: 18,
      taxAmount: 0,
      total: 0
    });
    
    setCurrentInvoiceId(null);
    setIsEditing(false);
    setErrors({});
    setApiError('');
  };

  // Handle item changes
  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    const newItems = [...invoice.items];
    newItems[index] = { ...newItems[index], [name]: value };
    setInvoice({ ...invoice, items: newItems });
  };

  // Add new item
  const addItem = () => {
    setInvoice({
      ...invoice,
      items: [...invoice.items, { description: '', quantity: 1, rate: 0, amount: 0 }]
    });
  };

  // Remove item
  const removeItem = (index) => {
    const newItems = [...invoice.items];
    newItems.splice(index, 1);
    setInvoice({ ...invoice, items: newItems });
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!invoice.clientName) newErrors.clientName = "Client name is required";
    if (!invoice.clientEmail) {
      newErrors.clientEmail = "Client email is required";
    } else if (!/\S+@\S+\.\S+/.test(invoice.clientEmail)) {
      newErrors.clientEmail = "Email address is invalid";
    }
    if (!invoice.issueDate) newErrors.issueDate = "Issue date is required";
    if (!invoice.dueDate) newErrors.dueDate = "Due date is required";
    
    // Validate items
    let hasItemError = false;
    invoice.items.forEach((item, index) => {
      if (!item.description) {
        newErrors[`item-${index}-description`] = "Description is required";
        hasItemError = true;
      }
    });
    
    if (hasItemError) {
      newErrors.items = "Please complete all item details";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save invoice
  const saveInvoice = async () => {
    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsSaving(true);
      setApiError('');
      
      let savedInvoice;
      
      if (isEditing) {
        // Update existing invoice
        savedInvoice = await invoiceService.updateInvoice(currentInvoiceId, {
          ...invoice,
          status: invoice.status || 'draft'
        });
        
        // Delete all existing items and create new ones
        await invoiceItemService.deleteInvoiceItems(currentInvoiceId);
        await invoiceItemService.createInvoiceItems(currentInvoiceId, invoice.items);
        
        // Update local state
        const updatedInvoices = invoices.map(inv => 
          inv.Id === currentInvoiceId ? savedInvoice : inv
        );
        setInvoices(updatedInvoices);
        toast.success("Invoice updated successfully!");
      } else {
        // Create new invoice
        savedInvoice = await invoiceService.createInvoice({
          ...invoice,
          status: 'draft'
        });
        
        // Create invoice items
        await invoiceItemService.createInvoiceItems(savedInvoice.Id, invoice.items);
        
        // Update local state
        setInvoices([...invoices, savedInvoice]);
        toast.success("Invoice created successfully!");
      }
      
      resetForm();
      setViewMode('list');
    } catch (error) {
      console.error("Error saving invoice:", error);
      setApiError("Failed to save invoice. Please try again.");
      toast.error("Failed to save invoice");
    } finally {
      setIsSaving(false);
    }
  };

  // Fetch invoice details including items
  const fetchInvoiceDetails = async (invoiceId) => {
    try {
      setIsLoading(true);
      setApiError('');
      
      // Get invoice data
      const invoiceData = await invoiceService.getInvoiceById(invoiceId);
      if (!invoiceData) {
        throw new Error("Invoice not found");
      }
      
      // Get invoice items
      const itemsData = await invoiceItemService.getInvoiceItems(invoiceId);
      
      // Format data for the UI
      const formattedItems = itemsData.map(item => ({
        id: item.Id,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount
      }));
      
      // If no items found, provide default empty item
      const items = formattedItems.length > 0 
        ? formattedItems 
        : [{ description: '', quantity: 1, rate: 0, amount: 0 }];
      
      // Set invoice with items
      const fullInvoice = {
        Id: invoiceData.Id,
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
        status: invoiceData.status,
        items: items
      };
      
      return fullInvoice;
    } catch (error) {
      console.error(`Error fetching invoice details for ID ${invoiceId}:`, error);
      toast.error("Failed to load invoice details");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Delete invoice
  const deleteInvoice = async (invoiceId) => {
    try {
      setIsDeleting(true);
      setApiError('');
      
      // Delete invoice items first
      await invoiceItemService.deleteInvoiceItems(invoiceId);
      
      // Then delete the invoice
      await invoiceService.deleteInvoice(invoiceId);
      
      // Update local state
      const updatedInvoices = invoices.filter(inv => inv.Id !== invoiceId);
      setInvoices(updatedInvoices);
      
      toast.success("Invoice deleted successfully!");
      
      // If we're in detail view, go back to list
      if (viewMode === 'detail') {
        setViewMode('list');
      }
    } catch (error) {
      console.error(`Error deleting invoice with ID ${invoiceId}:`, error);
      setApiError("Failed to delete invoice. Please try again.");
      toast.error("Failed to delete invoice");
    } finally {
      setIsDeleting(false);
    }
  };

  // Edit invoice
  const editInvoice = async (invoice) => {
    try {
      setIsLoading(true);
      setApiError('');
      
      const fullInvoice = await fetchInvoiceDetails(invoice.Id);
      
      setInvoice(fullInvoice);
      setCurrentInvoiceId(invoice.Id);
      setIsEditing(true);
      setViewMode('create');
    } catch (error) {
      console.error("Error loading invoice for editing:", error);
      toast.error("Failed to load invoice for editing");
    } finally {
      setIsLoading(false);
    }
  };

  // View invoice details
  const viewInvoice = async (invoice) => {
    try {
      setIsLoading(true);
      setApiError('');
      
      const fullInvoice = await fetchInvoiceDetails(invoice.Id);
      
      setSelectedInvoice(fullInvoice);
      setViewMode('detail');
    } catch (error) {
      console.error("Error loading invoice details:", error);
      toast.error("Failed to load invoice details");
    } finally {
      setIsLoading(false);
    }
  };

  // Mark invoice as sent
  const markAsSent = async (id) => {
    try {
      const invoice = invoices.find(inv => inv.Id === id);
      if (!invoice) return;
      
      const updatedInvoice = await invoiceService.updateInvoice(id, {
        ...invoice,
        status: 'sent'
      });
      
      // Update local state
      const updatedInvoices = invoices.map(inv => 
        inv.Id === id ? updatedInvoice : inv
      );
      setInvoices(updatedInvoices);
      
      // If this is the currently selected invoice, update it
      if (selectedInvoice && selectedInvoice.Id === id) {
        setSelectedInvoice({...selectedInvoice, status: 'sent'});
      }
      
      toast.success("Invoice marked as sent!");
    } catch (error) {
      console.error(`Error updating invoice status for ID ${id}:`, error);
      toast.error("Failed to update invoice status");
    }
  };

  // Mark invoice as paid
  const markAsPaid = async (id) => {
    try {
      const invoice = invoices.find(inv => inv.Id === id);
      if (!invoice) return;
      
      const updatedInvoice = await invoiceService.updateInvoice(id, {
        ...invoice,
        status: 'paid'
      });
      
      // Update local state
      const updatedInvoices = invoices.map(inv => 
        inv.Id === id ? updatedInvoice : inv
      );
      setInvoices(updatedInvoices);
      
      // If this is the currently selected invoice, update it
      if (selectedInvoice && selectedInvoice.Id === id) {
        setSelectedInvoice({...selectedInvoice, status: 'paid'});
      }
      
      toast.success("Invoice marked as paid!");
    } catch (error) {
      console.error(`Error updating invoice status for ID ${id}:`, error);
      toast.error("Failed to update invoice status");
    }
  };

  // Mark invoice as overdue
  const markAsOverdue = async (id) => {
    try {
      const invoice = invoices.find(inv => inv.Id === id);
      if (!invoice) return;
      
      const updatedInvoice = await invoiceService.updateInvoice(id, {
        ...invoice,
        status: 'overdue'
      });
      
      // Update local state
      const updatedInvoices = invoices.map(inv => 
        inv.Id === id ? updatedInvoice : inv
      );
      setInvoices(updatedInvoices);
      
      // If this is the currently selected invoice, update it
      if (selectedInvoice && selectedInvoice.Id === id) {
        setSelectedInvoice({...selectedInvoice, status: 'overdue'});
      }
      
      toast.success("Invoice marked as overdue!");
    } catch (error) {
      console.error(`Error updating invoice status for ID ${id}:`, error);
      toast.error("Failed to update invoice status");
} catch (error) {
      console.error(`Error updating invoice status for ID ${id}:`, error);
      toast.error("Failed to update invoice status");
    }
  };

  // Reset form
  const resetForm = () => {
    setInvoice({
      invoiceNumber: '',
      issueDate: '',
      dueDate: '',
      clientName: '',
      clientEmail: '',
      clientAddress: '',
      items: [{ description: '', quantity: 1, rate: 0, amount: 0 }],
      notes: '',
      subtotal: 0,
      taxRate: 18,
      taxAmount: 0,
      total: 0
    });
    setCurrentInvoiceId(null);
    setIsEditing(false);
    setErrors({});
    setApiError('');
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'sent':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'draft':
        return 'bg-surface-100 text-surface-800 dark:bg-surface-700 dark:text-surface-300';
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-surface-100 text-surface-800 dark:bg-surface-700 dark:text-surface-300';
    }
  };

  // Convert string date to formatted date
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* View Mode Navigation */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">
          {viewMode === 'list' && 'Invoice Management'}
          {viewMode === 'create' && (isEditing ? 'Edit Invoice' : 'Create New Invoice')}
          {viewMode === 'detail' && 'Invoice Details'}
        </h2>
{viewMode === 'list' && (
          <button
            onClick={() => {
              initializeNewInvoice();
              setViewMode('create'); 
              setIsEditing(false);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Create Invoice</span>
          </button>
        )}
        )}
        
        {(viewMode === 'create' || viewMode === 'detail') && (
          <button
            onClick={() => {
              resetForm();
              setViewMode('list');
            }}
            className="btn-outline flex items-center gap-2"
          >
            <span>Back to List</span>
          </button>
        )}
      </div>

      {/* Invoice List View */}
      {viewMode === 'list' && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="card overflow-hidden"
          >
            {isLoading && (
              <div className="flex justify-center items-center p-8">
                <LoadingSpinner className="animate-spin h-8 w-8 text-primary" />
              </div>
            )}
            
            {apiError && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertIcon className="h-5 w-5" />
                <p>{apiError}</p>
              </div>
            )}
            {invoices.length === 0 ? (
              <div className="p-8 text-center">
                <div className="bg-surface-100 dark:bg-surface-800 p-4 rounded-full inline-block mb-4">
                  <FileEditIcon className="h-10 w-10 text-surface-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">No Invoices Yet</h3>
                <p className="text-surface-500 dark:text-surface-400 mb-4">
                  Create your first invoice to get started!
                </p>
                <button 
                  onClick={() => {
                    resetForm();
                    setViewMode('create');
                  }}
                  className="btn-primary"
                >
                  Create Invoice
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-50 dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700">
                    <tr>
                      <th className="p-4 text-left text-surface-500 dark:text-surface-400 font-medium">Invoice #</th>
                      <th className="p-4 text-left text-surface-500 dark:text-surface-400 font-medium">Client</th>
                      <th className="p-4 text-left text-surface-500 dark:text-surface-400 font-medium">Date</th>
                      <th className="p-4 text-left text-surface-500 dark:text-surface-400 font-medium">Due Date</th>
                      <th className="p-4 text-left text-surface-500 dark:text-surface-400 font-medium">Amount</th>
                      <th className="p-4 text-left text-surface-500 dark:text-surface-400 font-medium">Status</th>
                      <th className="p-4 text-left text-surface-500 dark:text-surface-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                    {invoices.map((inv) => (
                      <motion.tr 
                        key={inv.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-surface-50 dark:hover:bg-surface-800/60 cursor-pointer"
                        onClick={() => viewInvoice(inv)}
                      >
                        <td className="p-4">{inv.invoiceNumber || 'N/A'}</td>
                        <td className="p-4">{inv.clientName || 'N/A'}</td>
                        <td className="p-4">{formatDate(inv.issueDate) || 'N/A'}</td>
                        <td className="p-4">{formatDate(inv.dueDate) || 'N/A'}</td>
                        <td className="p-4 font-medium">{formatCurrency(inv.total || 0)}</td>
                        <td className="p-4">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(inv.status)}`}>
                            {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {inv.status === 'draft' && (
                              <button
                                onClick={() => markAsSent(inv.Id)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded dark:text-blue-400 dark:hover:bg-blue-900/20"
                                title="Mark as Sent"
                              >
                                <SendIcon className="h-4 w-4" />
                              </button>
                            )}
                            {inv.status === 'sent' && (
                              <button
                                onClick={() => markAsPaid(inv.Id)}
                                className="p-1 text-green-600 hover:bg-green-50 rounded dark:text-green-400 dark:hover:bg-green-900/20"
                                title="Mark as Paid"
                              >
                                <CheckCircleIcon className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => editInvoice(inv)}
                              className="p-1 text-surface-600 hover:bg-surface-100 rounded dark:text-surface-400 dark:hover:bg-surface-700"
                              title="Edit"
                            >
                              <FileEditIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this invoice?")) {
                                  deleteInvoice(inv.Id);
                                }
                              }}
                              className="p-1 text-red-600 hover:bg-red-50 rounded dark:text-red-400 dark:hover:bg-red-900/20"
                              title="Delete"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Create/Edit Invoice Form */}
      {viewMode === 'create' && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="card p-6"
          >
            {apiError && (
              <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2 rounded-lg">
                <AlertIcon className="h-5 w-5" />
                <p>{apiError}</p>
              </div>
            )}
            
            {isLoading && (
              <div className="flex justify-center items-center py-8">
                <div className="flex flex-col items-center gap-2">
                  <LoadingSpinner className="animate-spin h-8 w-8 text-primary" />
                  <p className="text-surface-600 dark:text-surface-400">Loading invoice data...</p>
                </div>
              </div>
            )}
            {!isLoading && <form onSubmit={(e) => {
              e.preventDefault();
              saveInvoice();
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b border-surface-200 dark:border-surface-700 pb-2">
                    Invoice Details
                  </h3>
                  
                  <div>
                    <label htmlFor="invoiceNumber" className="form-label">
                      Invoice Number
                    </label>
                    <input
                      type="text"
                      id="invoiceNumber"
                      name="invoiceNumber"
                      value={invoice.invoiceNumber}
                      onChange={handleChange}
                      className="input-field"
                      readOnly
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="issueDate" className="form-label">
                        Issue Date*
                      </label>
                      <input
                        type="date"
                        id="issueDate"
                        name="issueDate"
                        value={invoice.issueDate}
                        onChange={handleChange}
                        className={`input-field ${errors.issueDate ? 'border-red-500 dark:border-red-500' : ''}`}
                      />
                      {errors.issueDate && (
                        <p className="text-red-500 text-sm mt-1">{errors.issueDate}</p>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="dueDate" className="form-label">
                        Due Date*
                      </label>
                      <input
                        type="date"
                        id="dueDate"
                        name="dueDate"
                        value={invoice.dueDate}
                        onChange={handleChange}
                        className={`input-field ${errors.dueDate ? 'border-red-500 dark:border-red-500' : ''}`}
                      />
                      {errors.dueDate && (
                        <p className="text-red-500 text-sm mt-1">{errors.dueDate}</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="taxRate" className="form-label">
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      id="taxRate"
                      name="taxRate"
                      min="0"
                      max="100"
                      value={invoice.taxRate}
                      onChange={handleChange}
                      className="input-field"
                    />
                  </div>
                </div>
                
                {/* Right Column */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b border-surface-200 dark:border-surface-700 pb-2">
                    Client Information
                  </h3>
                  
                  <div>
                    <label htmlFor="clientName" className="form-label">
                      Client Name*
                    </label>
                    <input
                      type="text"
                      id="clientName"
                      name="clientName"
                      value={invoice.clientName}
                      onChange={handleChange}
                      className={`input-field ${errors.clientName ? 'border-red-500 dark:border-red-500' : ''}`}
                      placeholder="Enter client name"
                    />
                    {errors.clientName && (
                      <p className="text-red-500 text-sm mt-1">{errors.clientName}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="clientEmail" className="form-label">
                      Client Email*
                    </label>
                    <input
                      type="email"
                      id="clientEmail"
                      name="clientEmail"
                      value={invoice.clientEmail}
                      onChange={handleChange}
                      className={`input-field ${errors.clientEmail ? 'border-red-500 dark:border-red-500' : ''}`}
                      placeholder="Enter client email"
                    />
                    {errors.clientEmail && (
                      <p className="text-red-500 text-sm mt-1">{errors.clientEmail}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="clientAddress" className="form-label">
                      Client Address
                    </label>
                    <textarea
                      id="clientAddress"
                      name="clientAddress"
                      value={invoice.clientAddress}
                      onChange={handleChange}
                      className="input-field"
                      rows="3"
                      placeholder="Enter client address"
                    ></textarea>
                  </div>
                </div>
              </div>
              
              {/* Invoice Items */}
              <div className="mb-6">
                <div className="flex justify-between items-center border-b border-surface-200 dark:border-surface-700 pb-2 mb-4">
                  <h3 className="text-lg font-semibold">
                    Invoice Items
                  </h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="btn-secondary text-sm flex items-center gap-1"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add Item
                  </button>
                </div>
                
                {errors.items && (
                  <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg mb-4">
                    <p className="text-sm">{errors.items}</p>
                  </div>
                )}
                
                <div className="overflow-x-auto">
                  <table className="w-full mb-4">
                    <thead className="bg-surface-50 dark:bg-surface-800 text-surface-500 dark:text-surface-400">
                      <tr>
                        <th className="p-3 text-left font-medium">Description*</th>
                        <th className="p-3 text-right font-medium">Quantity</th>
                        <th className="p-3 text-right font-medium">Rate</th>
                        <th className="p-3 text-right font-medium">Amount</th>
                        <th className="p-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                      {invoice.items.map((item, index) => (
                        <tr key={index}>
                          <td className="p-3">
                            <input
                              type="text"
                              name="description"
                              value={item.description}
                              onChange={(e) => handleItemChange(index, e)}
                              className={`input-field ${errors[`item-${index}-description`] ? 'border-red-500 dark:border-red-500' : ''}`}
                              placeholder="Item description"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              name="quantity"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, e)}
                              className="input-field text-right"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              name="rate"
                              min="0"
                              step="0.01"
                              value={item.rate}
                              onChange={(e) => handleItemChange(index, e)}
                              className="input-field text-right"
                            />
                          </td>
                          <td className="p-3 text-right font-medium">
                            {formatCurrency(item.amount)}
                          </td>
                          <td className="p-3">
                            {invoice.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                title="Remove item"
                              >
                                <XCircleIcon className="h-5 w-5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Totals */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-semibold border-b border-surface-200 dark:border-surface-700 pb-2 mb-4">
                    Notes
                  </h3>
                  <textarea
                    name="notes"
                    value={invoice.notes}
                    onChange={handleChange}
                    className="input-field"
                    rows="4"
                    placeholder="Additional notes or payment instructions..."
                  ></textarea>
                </div>
                
                <div className="flex flex-col">
                  <h3 className="text-lg font-semibold border-b border-surface-200 dark:border-surface-700 pb-2 mb-4">
                    Invoice Summary
                  </h3>
                  
                  <div className="mt-auto">
                    <div className="bg-surface-50 dark:bg-surface-800 rounded-lg p-4">
                      <div className="flex justify-between py-2 border-b border-surface-200 dark:border-surface-700">
                        <span className="text-surface-600 dark:text-surface-400">Subtotal:</span>
                        <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-surface-200 dark:border-surface-700">
                        <span className="text-surface-600 dark:text-surface-400">Tax ({invoice.taxRate}%):</span>
                        <span className="font-medium">{formatCurrency(invoice.taxAmount)}</span>
                      </div>
                      <div className="flex justify-between py-2 text-lg font-bold">
                        <span>Total:</span>
                        <span className="text-primary dark:text-primary-light">{formatCurrency(invoice.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Form Actions */}
              <div className="flex justify-end mt-6 space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setViewMode('list');
                  }}
                  className="btn bg-surface-200 text-surface-800 hover:bg-surface-300 dark:bg-surface-700 dark:text-surface-200 dark:hover:bg-surface-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex items-center gap-2"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <LoadingSpinner className="animate-spin h-4 w-4" />
                      <span>{isEditing ? 'Updating...' : 'Saving...'}</span>
                    </>
                  ) : (
                    <>
                      <SaveIcon className="h-4 w-4" />
                      <span>{isEditing ? 'Update Invoice' : 'Save Invoice'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Invoice Detail View */}
      {viewMode === 'detail' && selectedInvoice && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="card print:shadow-none"
          >
            {isLoading && (
              <div className="flex justify-center items-center py-8">
                <LoadingSpinner className="animate-spin h-8 w-8 text-primary" />
              </div>
            )}
            
            {apiError && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertIcon className="h-5 w-5" />
                <p>{apiError}</p>
              </div>
            )}
            <div className="p-6 md:p-8">
              {/* Invoice Header */}
              <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-primary dark:text-primary-light mb-1">
                    PrathaBill
                  </h1>
                  <p className="text-surface-500 dark:text-surface-400">
                    Comprehensive Billing Solutions
                  </p>
                </div>
                <div className="mt-4 md:mt-0 bg-surface-50 dark:bg-surface-800 p-4 rounded-lg">
                  <h2 className="text-xl font-bold mb-1">Invoice</h2>
                  <p className="text-surface-500 dark:text-surface-400 mb-1">
                    <span className="font-medium">Number:</span> {selectedInvoice.invoiceNumber}
                  </p>
                  <p className="text-surface-500 dark:text-surface-400 mb-1">
                    <span className="font-medium">Issue Date:</span> {formatDate(selectedInvoice.issueDate)}
                  </p>
                  <p className="text-surface-500 dark:text-surface-400">
                    <span className="font-medium">Due Date:</span> {formatDate(selectedInvoice.dueDate)}
                  </p>
                </div>
              </div>
              
              {/* Bill To / Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <h3 className="text-surface-500 dark:text-surface-400 font-medium mb-2">Bill To:</h3>
                  <p className="font-semibold text-lg mb-1">{selectedInvoice.clientName}</p>
                  <p className="text-surface-600 dark:text-surface-400 mb-1">{selectedInvoice.clientEmail}</p>
                  {selectedInvoice.clientAddress && (
                    <p className="text-surface-600 dark:text-surface-400 whitespace-pre-line">
                      {selectedInvoice.clientAddress}
                    </p>
                  )}
                </div>
                <div className="flex flex-col md:items-end">
                  <h3 className="text-surface-500 dark:text-surface-400 font-medium mb-2">Status:</h3>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedInvoice.status)}`}>
                    {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
                  </span>
                  
                  {/* Action Buttons */}
                  <div className="mt-4 flex gap-2">
                    {selectedInvoice.status === 'draft' && (
                      <button
                        onClick={() => {
                          markAsSent(selectedInvoice.Id);
                          setSelectedInvoice({...selectedInvoice, status: 'sent'});
                        }}
                        className="btn bg-blue-500 text-white hover:bg-blue-600 flex items-center gap-1"
                      >
                        <SendIcon className="h-4 w-4" />
                        <span>Mark as Sent</span>
                      </button>
                    )}
                    {selectedInvoice.status === 'sent' && (
                      <button
                        onClick={() => {
                          markAsPaid(selectedInvoice.Id);
                          setSelectedInvoice({...selectedInvoice, status: 'paid'});
                        }}
                        className="btn bg-green-500 text-white hover:bg-green-600 flex items-center gap-1"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                        <span>Mark as Paid</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Invoice Items */}
              <div className="mb-8">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface-50 dark:bg-surface-800 text-surface-500 dark:text-surface-400">
                      <tr>
                        <th className="p-3 text-left font-medium">Description</th>
                        <th className="p-3 text-right font-medium">Quantity</th>
                        <th className="p-3 text-right font-medium">Rate</th>
                        <th className="p-3 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                      {selectedInvoice.items.map((item, index) => (
                        <tr key={index}>
                          <td className="p-3">{item.description}</td>
                          <td className="p-3 text-right">{item.quantity}</td>
                          <td className="p-3 text-right">{formatCurrency(item.rate)}</td>
                          <td className="p-3 text-right font-medium">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-surface-50 dark:bg-surface-800">
                      <tr>
                        <td colSpan="3" className="p-3 text-right font-medium">Subtotal:</td>
                        <td className="p-3 text-right font-medium">{formatCurrency(selectedInvoice.subtotal)}</td>
                      </tr>
                      <tr>
                        <td colSpan="3" className="p-3 text-right font-medium">Tax ({selectedInvoice.taxRate}%):</td>
                        <td className="p-3 text-right font-medium">{formatCurrency(selectedInvoice.taxAmount)}</td>
                      </tr>
                      <tr>
                        <td colSpan="3" className="p-3 text-right text-lg font-bold">Total:</td>
                        <td className="p-3 text-right text-lg font-bold text-primary dark:text-primary-light">
                          {formatCurrency(selectedInvoice.total)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              
              {/* Notes */}
              {selectedInvoice.notes && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-2">Notes</h3>
                  <div className="bg-surface-50 dark:bg-surface-800 p-4 rounded-lg">
                    <p className="text-surface-600 dark:text-surface-400 whitespace-pre-line">
                      {selectedInvoice.notes}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Footer Actions */}
              <div className="flex flex-wrap justify-between gap-3 mt-8 pt-6 border-t border-surface-200 dark:border-surface-700">
                <div className="flex gap-2">
                  <button
                    onClick={() => editInvoice(selectedInvoice)}
                    className="btn-outline flex items-center gap-2"
                  >
                    <FileEditIcon className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
<button
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this invoice?")) {
                        deleteInvoice(selectedInvoice.Id);
                      }
                    }}
                    className="btn bg-red-500 text-white hover:bg-red-600 flex items-center gap-2"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <LoadingSpinner className="animate-spin h-4 w-4" />
                    ) : (
                      <TrashIcon className="h-4 w-4" />
                    )}
                    <span>Delete</span>
                  </button>
                </div>
                <button
                  onClick={() => window.print()}
                  className="btn-primary flex items-center gap-2"
                >
                  {(() => {
                    const PrinterIcon = getIcon('Printer');
                    return <PrinterIcon className="h-4 w-4" />;
                  })()}
                  <span>Print / Download</span>
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

export default MainFeature;
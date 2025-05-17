import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getIcon } from '../utils/iconUtils';

function MainFeature({ toast }) {
  // Icons
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
  
  // UI state
  const [isEditing, setIsEditing] = useState(false);
  const [currentInvoiceId, setCurrentInvoiceId] = useState(null);
  const [errors, setErrors] = useState({});
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
    if (viewMode === 'create' && !isEditing) {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const invoiceCount = (invoices.length + 1).toString().padStart(3, '0');
      setInvoice({
        ...invoice,
        invoiceNumber: `INV-${year}${month}-${invoiceCount}`,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(date.setDate(date.getDate() + 30)).toISOString().split('T')[0]
      });
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
  const saveInvoice = () => {
    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    if (isEditing) {
      // Update existing invoice
      const updatedInvoices = invoices.map(inv => 
        inv.id === currentInvoiceId ? { ...invoice, id: currentInvoiceId } : inv
      );
      setInvoices(updatedInvoices);
      toast.success("Invoice updated successfully!");
    } else {
      // Create new invoice
      const newInvoice = {
        ...invoice,
        id: Date.now().toString(),
        status: 'draft',
        createdAt: new Date().toISOString()
      };
      setInvoices([...invoices, newInvoice]);
      toast.success("Invoice created successfully!");
    }
    
    resetForm();
    setViewMode('list');
  };

  // Delete invoice
  const deleteInvoice = (id) => {
    const updatedInvoices = invoices.filter(inv => inv.id !== id);
    setInvoices(updatedInvoices);
    toast.success("Invoice deleted successfully!");
  };

  // Edit invoice
  const editInvoice = (invoice) => {
    setInvoice(invoice);
    setCurrentInvoiceId(invoice.id);
    setIsEditing(true);
    setViewMode('create');
  };

  // View invoice details
  const viewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setViewMode('detail');
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

  // Mark invoice as sent
  const markAsSent = (id) => {
    const updatedInvoices = invoices.map(inv => 
      inv.id === id ? { ...inv, status: 'sent' } : inv
    );
    setInvoices(updatedInvoices);
    toast.success("Invoice marked as sent!");
  };

  // Mark invoice as paid
  const markAsPaid = (id) => {
    const updatedInvoices = invoices.map(inv => 
      inv.id === id ? { ...inv, status: 'paid' } : inv
    );
    setInvoices(updatedInvoices);
    toast.success("Invoice marked as paid!");
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
              resetForm();
              setViewMode('create');
            }}
            className="btn-primary flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Create Invoice</span>
          </button>
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
                        <td className="p-4">{inv.invoiceNumber}</td>
                        <td className="p-4">{inv.clientName}</td>
                        <td className="p-4">{formatDate(inv.issueDate)}</td>
                        <td className="p-4">{formatDate(inv.dueDate)}</td>
                        <td className="p-4 font-medium">{formatCurrency(inv.total)}</td>
                        <td className="p-4">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(inv.status)}`}>
                            {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {inv.status === 'draft' && (
                              <button
                                onClick={() => markAsSent(inv.id)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded dark:text-blue-400 dark:hover:bg-blue-900/20"
                                title="Mark as Sent"
                              >
                                <SendIcon className="h-4 w-4" />
                              </button>
                            )}
                            {inv.status === 'sent' && (
                              <button
                                onClick={() => markAsPaid(inv.id)}
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
                                  deleteInvoice(inv.id);
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
            <form onSubmit={(e) => {
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
                >
                  <SaveIcon className="h-4 w-4" />
                  <span>{isEditing ? 'Update Invoice' : 'Save Invoice'}</span>
                </button>
              </div>
            </form>
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
                          markAsSent(selectedInvoice.id);
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
                          markAsPaid(selectedInvoice.id);
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
                        deleteInvoice(selectedInvoice.id);
                        setViewMode('list');
                      }
                    }}
                    className="btn bg-red-500 text-white hover:bg-red-600 flex items-center gap-2"
                  >
                    <TrashIcon className="h-4 w-4" />
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
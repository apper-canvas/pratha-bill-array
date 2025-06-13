import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import MainFeature from '../components/MainFeature';
import { getIcon } from '../utils/iconUtils';
import { invoiceService } from '../services/invoiceService';

function Home({ toast }) {
  const [activeTab, setActiveTab] = useState('invoice');
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState({
    totalInvoices: 0,
    pendingPayments: 0,
    totalRevenue: 0,
    activeClients: 0
  });
  
  const { user } = useSelector(state => state.user);
  
  const tabs = [
    { id: 'invoice', label: 'Invoices', icon: 'FileText' },
    { id: 'client', label: 'Clients', icon: 'Users' },
    { id: 'payment', label: 'Payments', icon: 'CreditCard' },
    { id: 'report', label: 'Reports', icon: 'BarChart' }
  ];
  
  // Fetch dashboard data
  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setIsLoading(true);
        // Get all invoices
        const invoices = await invoiceService.getInvoices();
        
        // Calculate dashboard stats
        const totalInvoices = invoices.length;
        const pendingInvoices = invoices.filter(inv => inv.status === 'sent' || inv.status === 'draft').length;
        const totalRevenue = invoices
          .filter(inv => inv.status === 'paid')
          .reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
          
        // Count unique clients test
        const uniqueClients = [...new Set(invoices.map(inv => inv.clientEmail))].length;
        
        setDashboardStats({
          totalInvoices,
          pendingPayments: pendingInvoices,
          totalRevenue,
          activeClients: uniqueClients
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchDashboardData();
  }, []);
  
  // Build stats array from fetched data
  const stats = [
    { title: 'Total Invoices', value: dashboardStats.totalInvoices.toString(), icon: 'FileText', color: 'bg-blue-100 dark:bg-blue-900/30', textColor: 'text-blue-700 dark:text-blue-400' },
    { title: 'Pending Payments', value: dashboardStats.pendingPayments.toString(), icon: 'Clock', color: 'bg-amber-100 dark:bg-amber-900/30', textColor: 'text-amber-700 dark:text-amber-400' },
    { title: 'Total Revenue', value: `₹${dashboardStats.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, icon: 'DollarSign', color: 'bg-green-100 dark:bg-green-900/30', textColor: 'text-green-700 dark:text-green-400' },
    { title: 'Active Clients', value: dashboardStats.activeClients.toString(), icon: 'Users', color: 'bg-purple-100 dark:bg-purple-900/30', textColor: 'text-purple-700 dark:text-purple-400' }
  ];

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">
            Welcome {user?.firstName || ''} to PrathaBill, your complete billing solution
          </p>
        </div>
        
        <button 
          onClick={() => {
            setActiveTab('invoice');
            toast.info("Quick invoice creation is now available!");
          }}
          className="btn-primary flex items-center gap-2 self-start"
        >
          {(() => {
            const PlusIcon = getIcon('Plus');
            return <PlusIcon className="h-4 w-4" />;
          })()}
<span>New Invoice</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array(4).fill(0).map((_, index) => (
            <div key={index} className="card p-5 animate-pulse h-24"></div>
          ))
        ) : (
          stats.map((stat, index) => {
            const StatIcon = getIcon(stat.icon);
            
            return (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="card p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-surface-500 dark:text-surface-400 text-sm">{stat.title}</p>
                    <h3 className={`text-2xl font-bold mt-1 ${stat.textColor}`}>{stat.value}</h3>
                  </div>
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <StatIcon className={`h-5 w-5 ${stat.textColor}`} />
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
      {/* Tab Navigation */}
      <div className="border-b border-surface-200 dark:border-surface-700">
        <div className="flex overflow-x-auto scrollbar-hide gap-1 sm:gap-2">
          {tabs.map((tab) => {
            const TabIcon = getIcon(tab.icon);
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap
                  ${activeTab === tab.id 
                    ? 'border-primary text-primary dark:text-primary-light dark:border-primary-light' 
                    : 'border-transparent hover:text-primary hover:border-primary-light text-surface-600 dark:text-surface-400'}`}
              >
                <TabIcon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'invoice' && (
        <MainFeature toast={toast} />
      )}
      
      {activeTab === 'client' && (
        <div className="card p-6">
          <div className="text-center py-8">
            <div className="bg-surface-100 dark:bg-surface-800 p-4 rounded-full inline-block mb-4">
              {(() => {
                const UsersIcon = getIcon('Users');
                return <UsersIcon className="h-10 w-10 text-surface-400" />;
              })()}
            </div>
            <h2 className="text-xl font-bold mb-2">Client Management</h2>
            <p className="text-surface-500 dark:text-surface-400 max-w-md mx-auto mb-4">
              This section will allow you to manage your clients, their contact information, and view their transaction history.
            </p>
            <button className="btn-primary">
              Explore Client Features
            </button>
          </div>
        </div>
      )}
      
      {activeTab === 'payment' && (
        <div className="card p-6">
          <div className="text-center py-8">
            <div className="bg-surface-100 dark:bg-surface-800 p-4 rounded-full inline-block mb-4">
              {(() => {
                const CreditCardIcon = getIcon('CreditCard');
                return <CreditCardIcon className="h-10 w-10 text-surface-400" />;
              })()}
            </div>
            <h2 className="text-xl font-bold mb-2">Payment Tracking</h2>
            <p className="text-surface-500 dark:text-surface-400 max-w-md mx-auto mb-4">
              Track payments, update statuses, and generate receipts for your clients' transactions.
            </p>
            <button className="btn-primary">
              Explore Payment Features
            </button>
          </div>
        </div>
      )}
      
      {activeTab === 'report' && (
        <div className="card p-6">
          <div className="text-center py-8">
            <div className="bg-surface-100 dark:bg-surface-800 p-4 rounded-full inline-block mb-4">
              {(() => {
                const BarChartIcon = getIcon('BarChart');
                return <BarChartIcon className="h-10 w-10 text-surface-400" />;
              })()}
            </div>
            <h2 className="text-xl font-bold mb-2">Financial Reports</h2>
            <p className="text-surface-500 dark:text-surface-400 max-w-md mx-auto mb-4">
              Generate detailed reports and visualize your business performance over time.
            </p>
            <button className="btn-primary">
              Explore Report Features
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
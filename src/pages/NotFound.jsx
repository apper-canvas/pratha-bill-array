import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getIcon } from '../utils/iconUtils';

function NotFound() {
  const AlertTriangleIcon = getIcon('AlertTriangle');
  const HomeIcon = getIcon('Home');

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 100,
          delay: 0.2 
        }}
        className="bg-amber-100 dark:bg-amber-900/30 p-6 rounded-full mb-6"
      >
        <AlertTriangleIcon className="h-12 w-12 text-amber-600 dark:text-amber-400" />
      </motion.div>
      
      <h1 className="text-4xl md:text-5xl font-bold mb-4">404</h1>
      <h2 className="text-2xl md:text-3xl font-semibold mb-2">Page Not Found</h2>
      <p className="text-surface-500 dark:text-surface-400 mb-8 max-w-md">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      
      <Link 
        to="/" 
        className="btn-primary flex items-center gap-2"
      >
        <HomeIcon className="h-4 w-4" />
        <span>Back to Home</span>
      </Link>
    </motion.div>
  );
}

export default NotFound;
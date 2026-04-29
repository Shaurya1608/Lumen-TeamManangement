import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-dark-900 text-slate-200 font-sans selection:bg-brand-purple/30 selection:text-brand-purple-light">
      {/* Premium Ambient Glows */}
      <div 
        className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full blur-[100px] pointer-events-none bg-brand-blue/20" 
        style={{ willChange: 'transform' }}
      />
      <div 
        className="fixed bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[120px] pointer-events-none bg-brand-purple/20" 
        style={{ willChange: 'transform' }}
      />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-30 bg-dark-900/80 backdrop-blur-md lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full z-40 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
        lg:sticky lg:translate-x-0 lg:shrink-0 lg:w-60 shadow-2xl lg:shadow-none
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0 relative z-10">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 2xl:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { Bell, Search, X, Menu, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function Header({ onMenuClick }) {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    if (!socket || !user || user.role !== 'admin') return;
    socket.on('notification', (data) => {
      setNotifications(prev => [{ ...data, id: Date.now() }, ...prev].slice(0, 15));
    });
    return () => socket.off('notification');
  }, [socket, user]);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="lg:hidden h-[60px] border-b border-white/[0.05] bg-dark-900/50 backdrop-blur-2xl sticky top-0 z-20 flex items-center px-4 shrink-0">
      <button
        onClick={onMenuClick}
        className="w-10 h-10 rounded-xl glass flex items-center justify-center text-slate-300 hover:text-white transition-all"
      >
        <Menu size={20} />
      </button>
    </header>
  );
}

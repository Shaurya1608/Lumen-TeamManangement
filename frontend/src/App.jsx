import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import AdminDash from './pages/AdminDash';
import ModeratorDash from './pages/ModeratorDash';
import GroupsBrowse from './pages/GroupsBrowse';
import BusinessDashboard from './pages/BusinessDashboard';
import ClientDetail from './pages/ClientDetail';
import Layout from './components/Layout';

const AppLoader = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center animate-pulse">
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth={2.5}>
          <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="text-slate-500 text-sm">Loading TeamFlow…</p>
    </div>
  </div>
);

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <AppLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

const AuthRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <AppLoader />;
  if (user) return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
            <Route path="/signup" element={<AuthRoute><Signup /></AuthRoute>} />

            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="admin" element={
                <ProtectedRoute roles={['admin']}>
                  <AdminDash />
                </ProtectedRoute>
              } />
              <Route path="business" element={
                <ProtectedRoute roles={['admin']}>
                  <BusinessDashboard />
                </ProtectedRoute>
              } />
              <Route path="client/:id" element={
                <ProtectedRoute roles={['admin']}>
                  <ClientDetail />
                </ProtectedRoute>
              } />
              <Route path="moderator" element={
                <ProtectedRoute roles={['moderator']}>
                  <ModeratorDash />
                </ProtectedRoute>
              } />
              <Route path="groups" element={
                <ProtectedRoute roles={['member']}>
                  <GroupsBrowse />
                </ProtectedRoute>
              } />
            </Route>
          </Routes>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;

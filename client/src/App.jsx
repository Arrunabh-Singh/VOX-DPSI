import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'

import Login from './pages/Login'
import StudentDashboard from './pages/StudentDashboard'
import RaiseComplaint from './pages/RaiseComplaint'
import ComplaintDetail from './pages/ComplaintDetail'
import CouncilDashboard from './pages/CouncilDashboard'
import TeacherDashboard from './pages/TeacherDashboard'
import CoordinatorDashboard from './pages/CoordinatorDashboard'
import PrincipalDashboard from './pages/PrincipalDashboard'
import SupervisorDashboard from './pages/SupervisorDashboard'
import VicePrincipalDashboard from './pages/VicePrincipalDashboard'
import LoadingSpinner from './components/LoadingSpinner'

const ROLE_DASHBOARDS = {
  student:        StudentDashboard,
  council_member: CouncilDashboard,
  class_teacher:  TeacherDashboard,
  coordinator:    CoordinatorDashboard,
  principal:      PrincipalDashboard,
  supervisor:     SupervisorDashboard,
  vice_principal: VicePrincipalDashboard,
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#EEF2EC' }}>
      <LoadingSpinner message="Authenticating..." />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

function RoleRouter() {
  const { user } = useAuth()
  const Dashboard = ROLE_DASHBOARDS[user?.role]
  if (!Dashboard) return <div className="p-8 text-center text-gray-500">Unknown role: {user?.role}</div>
  return <Dashboard />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '12px',
              fontFamily: 'Outfit, system-ui, sans-serif',
              fontSize: '14px',
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(27,77,43,0.1)',
              boxShadow: '0 8px 32px rgba(27,77,43,0.12)',
            },
            success: { iconTheme: { primary: '#1B4D2B', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#DC2626', secondary: '#fff' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireAuth><RoleRouter /></RequireAuth>} />
          <Route path="/raise" element={<RequireAuth><RaiseComplaint /></RequireAuth>} />
          <Route path="/complaints/:id" element={<RequireAuth><ComplaintDetail /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

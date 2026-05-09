import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import api from './utils/api'
import { useSessionTimeout } from './hooks/useSessionTimeout'
import SessionTimeoutModal from './components/SessionTimeoutModal'

// Keep Railway from sleeping — ping every 4 minutes while tab is open
function KeepAlive() {
  useEffect(() => {
    const ping = () => api.get('/api/health').catch(() => {})
    ping() // immediate ping on load
    const id = setInterval(ping, 4 * 60 * 1000)
    return () => clearInterval(id)
  }, [])
  return null
}

// Session timeout guard — rendered inside BrowserRouter so useNavigate works
function SessionGuard() {
  const { showWarning, secondsLeft, extend, doLogout } = useSessionTimeout()
  if (!showWarning) return null
  return <SessionTimeoutModal secondsLeft={secondsLeft} onExtend={extend} onLogout={doLogout} />
}

import Login from './pages/Login'
import StudentDashboard from './pages/StudentDashboard'
import GuardianDashboard from './pages/GuardianDashboard'
import RaiseComplaint from './pages/RaiseComplaint'
import KnowledgeBase from './pages/KnowledgeBase'
import ComplaintDetail from './pages/ComplaintDetail'
import CouncilDashboard from './pages/CouncilDashboard'
import TeacherDashboard from './pages/TeacherDashboard'
import CoordinatorDashboard from './pages/CoordinatorDashboard'
import PrincipalDashboard from './pages/PrincipalDashboard'
import SupervisorDashboard from './pages/SupervisorDashboard'
import VicePrincipalDashboard from './pages/VicePrincipalDashboard'
import LoadingSpinner from './components/LoadingSpinner'
import PrivacyNoticeGate from './components/PrivacyNoticeGate'
 import VpcGate from './pages/VpcGate'
 import VpcVerify from './pages/VpcVerify'
 import CouncilOnboarding from './pages/CouncilOnboarding'

 const ROLE_DASHBOARDS = {
  student:        StudentDashboard,
  guardian:       GuardianDashboard,
  council_member: CouncilDashboard,
  class_teacher:  TeacherDashboard,
  coordinator:    CoordinatorDashboard,
  principal:      PrincipalDashboard,
  supervisor:     SupervisorDashboard,
  vice_principal: VicePrincipalDashboard,
  director:       SupervisorDashboard,   // Full read-only overview
  board_member:   SupervisorDashboard,   // Full read-only overview
}

 function RequireAuth({ children }) {
   const { user, loading } = useAuth()
   if (loading) return (
     <div className="min-h-screen flex items-center justify-center" style={{ background: '#EEF2EC' }}>
       <LoadingSpinner message="Authenticating..." />
     </div>
   )
   if (!user) return <Navigate to="/login" replace />
   // DPDP Act 2023: gate order — privacy notice first, then parental consent (#59)
   return (
     <PrivacyNoticeGate>
       <VpcGate>
         <OnboardingGate>{children}</OnboardingGate>
       </VpcGate>
     </PrivacyNoticeGate>
   )
 }

function RoleRouter() {
  const { user } = useAuth()
  const Dashboard = ROLE_DASHBOARDS[user?.role]
  if (!Dashboard) return <div className="p-8 text-center text-gray-500">Unknown role: {user?.role}</div>
  return <Dashboard />
}

// Onboarding gate — council members must complete onboarding before accessing other routes
function OnboardingGate({ children }) {
  const { user } = useAuth()
  const location = useLocation()
  if (user?.role === 'council_member' && !user.onboarding_completed && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }
  return children
}

export default function App() {
  return (
    <LanguageProvider>
    <AuthProvider>
      <BrowserRouter>
        <KeepAlive />
        <SessionGuard />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '12px',
              fontFamily: 'Outfit, system-ui, sans-serif',
              fontSize: '14px',
              background: 'rgba(255,255,255,0.95)',
              
              border: '1px solid rgba(27,77,43,0.1)',
              boxShadow: '0 8px 32px rgba(27,77,43,0.12)',
            },
            success: { iconTheme: { primary: '#1B4D2B', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#DC2626', secondary: '#fff' } },
          }}
        />
         <Routes>
           <Route path="/login" element={<Login />} />
           {/* Parent consent verify redirect — no auth required; parent opens this link */}
           <Route path="/vpc/verify" element={<VpcVerify />} />
           {/* Council onboarding — only council members, no onboarding guard (access to complete it) */}
           <Route path="/onboarding" element={<RequireAuth><CouncilOnboarding /></RequireAuth>} />
           <Route path="/" element={<RequireAuth><RoleRouter /></RequireAuth>} />
           <Route path="/raise" element={<RequireAuth><RaiseComplaint /></RequireAuth>} />
           <Route path="/help" element={<RequireAuth><KnowledgeBase /></RequireAuth>} />
           <Route path="/complaints/:id" element={<RequireAuth><ComplaintDetail /></RequireAuth>} />
           <Route path="*" element={<Navigate to="/" replace />} />
         </Routes>
      </BrowserRouter>
    </AuthProvider>
    </LanguageProvider>
  )
}

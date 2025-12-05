import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ClassProvider, useClass } from './context/ClassContext';
import { StudentProvider } from './context/StudentContext';
import { APIKeyProvider } from './context/APIKeyContext';
import { SaveStatusProvider } from './context/SaveStatusContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Login from './pages/Login';
import ClassSelect from './pages/ClassSelect';
import CreateClass from './pages/CreateClass';
import Dashboard from './pages/Dashboard';
import StudentManager from './pages/StudentManager';
import AttendanceTracker from './pages/AttendanceTracker';
import JournalEntry from './pages/JournalEntry';
import EvaluationView from './pages/EvaluationView';
import AssignmentManager from './pages/AssignmentManager';
import GradeManager from './pages/GradeManager';
import GradeInput from './pages/GradeInput';
import BudgetManager from './pages/BudgetManager';
import Notepad from './pages/Notepad';
import Settings from './pages/Settings';

// Protected Route - requires authentication
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Class Required Route - requires both auth and selected class
function ClassRequiredRoute({ children }) {
  const { user, loading: authLoading } = useAuth();
  const { currentClass } = useClass();

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!currentClass) {
    return <Navigate to="/select-class" replace />;
  }

  return children;
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ClassProvider>
          <StudentProvider>
            <APIKeyProvider>
              <SaveStatusProvider>
                <BrowserRouter>
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<Login />} />

                    {/* Protected Routes - Auth Required */}
                    <Route path="/select-class" element={
                      <ProtectedRoute>
                        <ClassSelect />
                      </ProtectedRoute>
                    } />

                    <Route path="/create-class" element={
                      <ProtectedRoute>
                        <CreateClass />
                      </ProtectedRoute>
                    } />

                    {/* Protected Routes - Auth + Class Required */}
                    <Route path="/" element={
                      <ClassRequiredRoute>
                        <Layout />
                      </ClassRequiredRoute>
                    }>
                      <Route index element={<Dashboard />} />
                      <Route path="students" element={<StudentManager />} />
                      <Route path="attendance" element={<AttendanceTracker />} />
                      <Route path="journal" element={<JournalEntry />} />
                      <Route path="evaluation" element={<EvaluationView />} />
                      <Route path="assignments" element={<AssignmentManager />} />
                      <Route path="grades" element={<GradeManager />} />
                      <Route path="grade-input" element={<GradeInput />} />
                      <Route path="budget" element={<BudgetManager />} />
                      <Route path="notepad" element={<Notepad />} />
                      <Route path="settings" element={<Settings />} />
                    </Route>

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/login" replace />} />
                  </Routes>
                </BrowserRouter>
              </SaveStatusProvider>
            </APIKeyProvider>
          </StudentProvider>
        </ClassProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

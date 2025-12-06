import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ClassProvider } from './context/ClassContext';
import { StudentProvider } from './context/StudentContext';
import { APIKeyProvider } from './context/APIKeyContext';
import { UpdateProvider } from './context/UpdateContext';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <APIKeyProvider>
            <ClassProvider>
              <StudentProvider>
                <SaveStatusProvider>
                  <UpdateProvider>
                    <Routes>
                      <Route path="/login" element={<Login />} />

                      <Route element={<ProtectedRoute />}>
                        <Route path="/select-class" element={<ClassSelect />} />
                        <Route path="/create-class" element={<CreateClass />} />

                        <Route element={<ClassRequiredRoute />}>
                          <Route element={<Layout />}>
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/students" element={<StudentManager />} />
                            <Route path="/attendance" element={<AttendanceTracker />} />
                            <Route path="/journal" element={<JournalEntry />} />
                            <Route path="/journal-entry" element={<JournalEntry />} />
                            <Route path="/evaluation" element={<EvaluationView />} />
                            <Route path="/assignments" element={<AssignmentManager />} />
                            <Route path="/grades" element={<GradeManager />} />
                            <Route path="/grade-input" element={<GradeInput />} />
                            <Route path="/budget" element={<BudgetManager />} />
                            <Route path="/notepad" element={<Notepad />} />
                            <Route path="/settings" element={<Settings />} />
                          </Route>
                        </Route>
                      </Route>
                    </Routes>
                  </UpdateProvider>
                </SaveStatusProvider>
              </StudentProvider>
            </ClassProvider>
          </APIKeyProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

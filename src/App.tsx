import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Settings from "./pages/Settings";
import TrainingChatbot from "./pages/TrainingChatbot";
import Staff from "./pages/Staff";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { AppLayout } from "./components/AppLayout";
import { ApiSettingsProvider } from "@/contexts/ApiSettingsContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import TrainingDocuments from "./pages/TrainingDocuments";
import ContentAi from "./pages/ContentAi";
import ProjectDetail from "./pages/ProjectDetail";
import CheckSeeding from "./pages/CheckSeeding";
import SeedingProjectDetail from "./pages/SeedingProjectDetail";
import Tools from "./pages/Tools";
import CheckKeywordComment from "@/pages/tools/check-keyword-comment";
import CheckKeywordCommentDetail from "@/pages/tools/CheckKeywordCommentDetail";
import CompletionNotification from "./pages/CompletionNotification";
import { NotificationProvider } from "./contexts/NotificationContext";
import CheckPostScan from "@/pages/tools/CheckPostScan";
import CheckPostScanDetail from "@/pages/tools/CheckPostScanDetail";
import { PermissionRoute } from "./components/PermissionRoute";
import Unauthorized from "./pages/Unauthorized";

const queryClient = new QueryClient();

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <ApiSettingsProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <NotificationProvider>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/unauthorized" element={<Unauthorized />} />
                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    <Route element={<PermissionRoute resource="dashboard" action="view" />}>
                      <Route path="/" element={<Dashboard />} />
                    </Route>
                    <Route element={<PermissionRoute resource="projects" action="view" />}>
                      <Route path="/projects" element={<Projects />} />
                    </Route>
                    <Route element={<PermissionRoute resource="settings" action="view" />}>
                      <Route path="/settings" element={<Settings />} />
                    </Route>
                    <Route element={<PermissionRoute resource="training-chatbot" action="view" />}>
                      <Route path="/training-chatbot" element={<TrainingChatbot />} />
                    </Route>
                    <Route element={<PermissionRoute resource="training-documents" action="view" />}>
                      <Route path="/training-documents" element={<TrainingDocuments />} />
                    </Route>
                    <Route element={<PermissionRoute resource="staff" action="view" />}>
                      <Route path="/staff" element={<Staff />} />
                    </Route>
                    <Route element={<PermissionRoute resource="content-ai" action="view" />}>
                      <Route path="/content-ai" element={<ContentAi />} />
                      <Route path="/content-ai/:projectId" element={<ProjectDetail />} />
                    </Route>
                    <Route element={<PermissionRoute resource="check-seeding" action="view" />}>
                      <Route path="/check-seeding" element={<CheckSeeding />} />
                      <Route path="/check-seeding/:projectId" element={<SeedingProjectDetail />} />
                    </Route>
                    <Route path="/completion-notification" element={<CompletionNotification />} />
                    <Route element={<PermissionRoute resource="tools" action="view" />}>
                      <Route path="/tools" element={<Tools />} />
                      <Route path="/tools/check-keyword-comment" element={<CheckKeywordComment />} />
                      <Route path="/tools/check-keyword-comment/:projectId" element={<CheckKeywordCommentDetail />} />
                      <Route path="/tools/check-post-scan" element={<CheckPostScan />} />
                      <Route path="/tools/check-post-scan/:projectId" element={<CheckPostScanDetail />} />
                    </Route>
                  </Route>
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </NotificationProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </ApiSettingsProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
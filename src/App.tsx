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
import CheckSeeding from "./pages/CheckSeeding";
import SeedingProjectDetail from "./pages/SeedingProjectDetail";
import Tools from "./pages/Tools";
import CheckKeywordComment from "@/pages/tools/check-keyword-comment";

const queryClient = new QueryClient();

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <ApiSettingsProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/training-chatbot" element={<TrainingChatbot />} />
                  <Route path="/training-documents" element={<TrainingDocuments />} />
                  <Route path="/staff" element={<Staff />} />
                  <Route path="/content-ai" element={<ContentAi />} />
                  <Route path="/check-seeding" element={<CheckSeeding />} />
                  <Route path="/check-seeding/:projectId" element={<SeedingProjectDetail />} />
                  <Route path="/tools" element={<Tools />} />
                  <Route path="/tools/check-keyword-comment" element={<CheckKeywordComment />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </QueryClientProvider>
      </ApiSettingsProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
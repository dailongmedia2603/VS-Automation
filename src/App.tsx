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
import { AppLayout } from "./components/AppLayout";
import { ApiSettingsProvider } from "@/contexts/ApiSettingsContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import TrainingDocuments from "./pages/TrainingDocuments";

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
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/training-chatbot" element={<TrainingChatbot />} />
                  <Route path="/training-documents" element={<TrainingDocuments />} />
                  <Route path="/staff" element={<Staff />} />
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
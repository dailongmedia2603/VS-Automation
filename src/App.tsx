import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Settings from "./pages/Settings";
import ChatwootSettings from "./pages/ChatwootSettings";
import ChatwootInbox from "./pages/ChatwootInbox";
import TrainingChatbot from "./pages/TrainingChatbot";
import Staff from "./pages/Staff";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import ZaloSettings from "./pages/ZaloSettings";
import { AppLayout } from "./components/AppLayout";
import { ApiSettingsProvider } from "@/contexts/ApiSettingsContext";
import { ChatwootProvider } from "@/contexts/ChatwootContext";
import ChatbotZalo from "./pages/ChatbotZalo";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import TrainingDocuments from "./pages/TrainingDocuments";
import TrainingZaloChatbot from "./pages/TrainingZaloChatbot";

const queryClient = new QueryClient();

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <ApiSettingsProvider>
        <ChatwootProvider>
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
                    <Route path="/chatbot-settings" element={<ChatwootSettings />} />
                    <Route path="/chatbot-inbox" element={<ChatwootInbox />} />
                    <Route path="/training-chatbot" element={<TrainingChatbot />} />
                    <Route path="/training-documents" element={<TrainingDocuments />} />
                    <Route path="/staff" element={<Staff />} />
                    <Route path="/chatbot-zalo" element={<ChatbotZalo />} />
                    <Route path="/zalo-settings" element={<ZaloSettings />} />
                    <Route path="/training-zalo-chatbot" element={<TrainingZaloChatbot />} />
                  </Route>
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TooltipProvider>
          </QueryClientProvider>
        </ChatwootProvider>
      </ApiSettingsProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
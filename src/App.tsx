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
import { AppLayout } from "./components/AppLayout";
import { ApiSettingsProvider } from "@/contexts/ApiSettingsContext";
import { ChatwootProvider } from "@/contexts/ChatwootContext";

const queryClient = new QueryClient();

const App = () => (
  <ApiSettingsProvider>
    <ChatwootProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/chatbot-settings" element={<ChatwootSettings />} />
                <Route path="/chatbot-inbox" element={<ChatwootInbox />} />
                <Route path="/training-chatbot" element={<TrainingChatbot />} />
                <Route path="/staff" element={<Staff />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ChatwootProvider>
  </ApiSettingsProvider>
);

export default App;
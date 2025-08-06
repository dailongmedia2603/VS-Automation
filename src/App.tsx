import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AiPlanProjectPage from './pages/AiPlanProjectPage';
import Index from './pages/Index';
import { Toaster } from "@/components/ui/sonner"

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/projects/:projectId" element={<AiPlanProjectPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </>
  );
}

export default App;
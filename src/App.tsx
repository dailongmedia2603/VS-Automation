import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import IndexPage from "./pages/Index";
import CreatePlanPage from "./pages/CreatePlanPage";

function App() {
  return (
    <TooltipProvider>
      <Toaster />
      <Router>
        <Routes>
          <Route path="/" element={<IndexPage />} />
          <Route path="/create-plan" element={<CreatePlanPage />} />
        </Routes>
      </Router>
    </TooltipProvider>
  );
}

export default App;
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const IndexPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-800 mb-4">Welcome to AI Plan Generator</h1>
        <p className="text-lg text-slate-600 mb-8">Create intelligent marketing plans with the power of AI.</p>
        <Button asChild size="lg">
          <Link to="/create-plan">Bắt đầu tạo kế hoạch</Link>
        </Button>
      </div>
    </div>
  );
};

export default IndexPage;
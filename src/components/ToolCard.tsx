import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface ToolCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  color: string;
}

export const ToolCard: React.FC<ToolCardProps> = ({ icon: Icon, title, description, href, color }) => {
  return (
    <Link to={href} className="group block h-full">
      <Card className="h-full flex flex-col bg-white rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
        <CardHeader className="flex-grow">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="h-6 w-6" />
          </div>
          <CardTitle className="pt-4 text-lg font-bold text-slate-800">{title}</CardTitle>
          <CardDescription className="pt-1 text-sm text-slate-500">{description}</CardDescription>
        </CardHeader>
        <CardFooter>
          <div className="text-blue-600 font-semibold group-hover:text-blue-700 flex items-center">
            Sử dụng ngay
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
};
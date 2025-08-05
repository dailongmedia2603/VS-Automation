import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "For individuals starting out.",
    features: [
      "1,000 AI words/month",
      "1 project",
      "Basic support",
    ],
    isCurrent: true,
  },
  {
    name: "Pro",
    price: "$29",
    description: "For professionals and small teams.",
    features: [
      "50,000 AI words/month",
      "10 projects",
      "Priority support",
      "Advanced features",
    ],
    isCurrent: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large organizations.",
    features: [
      "Unlimited AI words",
      "Unlimited projects",
      "Dedicated support",
      "Custom integrations",
    ],
    isCurrent: false,
  },
];

const AiPlan = () => {
  return (
    <main className="flex-1 space-y-8 p-6 sm:p-8 bg-slate-50">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">AI Plan</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Choose the plan that's right for you and your team.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <Card key={plan.name} className={plan.isCurrent ? "border-2 border-blue-600" : ""}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-4xl font-bold">{plan.price}<span className="text-sm font-normal text-muted-foreground">/month</span></div>
              <ul className="space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center">
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full" disabled={plan.isCurrent}>
                {plan.isCurrent ? "Current Plan" : "Choose Plan"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </main>
  );
};

export default AiPlan;
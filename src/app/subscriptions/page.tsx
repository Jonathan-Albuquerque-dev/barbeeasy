import { getSubscriptions } from "@/lib/data";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function SubscriptionsPage() {
  const subscriptions = await getSubscriptions();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subscription Plans</h1>
        <p className="text-muted-foreground">Join the club and enjoy exclusive perks and savings.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {subscriptions.map(plan => (
          <Card key={plan.id} className={cn(
            "flex flex-col",
            plan.popular && "border-primary shadow-lg"
          )}>
            {plan.popular && (
              <div className="bg-accent text-accent-foreground py-1.5 px-4 text-sm font-semibold text-center rounded-t-lg flex items-center justify-center gap-2">
                <Star className="h-4 w-4" />
                Most Popular
              </div>
            )}
            <CardHeader className="text-center">
              <CardTitle className="text-3xl">{plan.name}</CardTitle>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
              <ul className="space-y-3">
                {plan.features.map(feature => (
                  <li key={feature} className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-3 mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button className={cn(
                "w-full",
                !plan.popular && "bg-primary"
              )}
              variant={plan.popular ? 'default' : 'secondary'}
              style={plan.popular ? { backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))'} : {}}
              >
                Subscribe Now
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

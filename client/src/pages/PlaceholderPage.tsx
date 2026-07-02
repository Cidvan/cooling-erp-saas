import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description: string;
  comingSoonFeatures?: string[];
}

export default function PlaceholderPage({ 
  title, 
  description, 
  comingSoonFeatures = [] 
}: PlaceholderPageProps) {

  const handleContactSupport = () => {
    console.log('Contact support clicked');
  };

  return (
    <div className="flex-1 space-y-6 p-6" data-testid={`page-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div>
        <h2 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
          {title}
        </h2>
        <p className="text-muted-foreground" data-testid="text-page-description">
          {description}
        </p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
            <Construction className="w-6 h-6 text-muted-foreground" />
          </div>
          <CardTitle data-testid="text-coming-soon-title">Coming Soon</CardTitle>
          <p className="text-muted-foreground" data-testid="text-coming-soon-description">
            This feature is currently under development and will be available in a future release.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {comingSoonFeatures.length > 0 && (
            <div>
              <h4 className="font-medium mb-2" data-testid="text-planned-features">
                Planned Features:
              </h4>
              <ul className="space-y-1">
                {comingSoonFeatures.map((feature, index) => (
                  <li 
                    key={index} 
                    className="text-sm text-muted-foreground flex items-center gap-2"
                    data-testid={`text-feature-${index}`}
                  >
                    <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="pt-4 text-center">
            <Button 
              variant="outline" 
              onClick={handleContactSupport}
              data-testid="button-contact-support"
            >
              Contact Support for Updates
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
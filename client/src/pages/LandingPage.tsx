import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, FileText, DollarSign, Users, CheckCircle } from "lucide-react";

export default function LandingPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="bg-primary text-primary-foreground rounded-full p-6">
              <Building2 className="h-16 w-16" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4" data-testid="text-landing-title">
            CoolDesk
          </h1>
          <h2 className="text-3xl font-semibold text-primary mb-4">
            ERP Management System
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Streamline your business operations with our comprehensive Enterprise Resource Planning solution
          </p>
          <Button
            size="lg"
            onClick={() => setLocation("/login")}
            className="text-lg px-8 py-6"
            data-testid="button-get-started"
          >
            Get Started
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="hover-elevate">
            <CardHeader>
              <div className="bg-blue-100 text-primary rounded-full p-3 w-fit mb-2">
                <Users className="h-6 w-6" />
              </div>
              <CardTitle>Client Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Manage client relationships, service history, and communications in one place
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <div className="bg-green-100 text-green-600 rounded-full p-3 w-fit mb-2">
                <FileText className="h-6 w-6" />
              </div>
              <CardTitle>Service Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Create detailed service reports, quotations, and track job progress efficiently
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <div className="bg-purple-100 text-purple-600 rounded-full p-3 w-fit mb-2">
                <DollarSign className="h-6 w-6" />
              </div>
              <CardTitle>Financial Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Monitor accounts receivable, payable, cash flow, and generate financial reports
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <div className="bg-orange-100 text-orange-600 rounded-full p-3 w-fit mb-2">
                <CheckCircle className="h-6 w-6" />
              </div>
              <CardTitle>Purchase Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Streamline purchasing process with automated PO management and tracking
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="py-12 text-center">
            <h3 className="text-2xl font-bold mb-4">
              Ready to transform your business operations?
            </h3>
            <p className="text-primary-foreground/90 mb-6 max-w-2xl mx-auto">
              Access real-time dashboards, comprehensive reporting, and intelligent automation
            </p>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => setLocation("/login")}
              data-testid="button-login-cta"
            >
              Login to Your Account
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 border-t py-6">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2026 CoolDesk. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus } from "lucide-react";
import type { Company } from "@shared/schema";

export default function SuperAdminCompanies() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    email: "",
    ownerUsername: "",
    ownerPassword: "",
    ownerEmail: "",
  });

  const { data: companies = [], isLoading } = useQuery<Company[]>({
    queryKey: ["/api/admin/companies"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/admin/companies", form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies"] });
      toast({ title: "Company created", description: `${form.name} has been added.` });
      setOpen(false);
      setForm({ name: "", slug: "", email: "", ownerUsername: "", ownerPassword: "", ownerEmail: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create company",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2" data-testid="text-page-title">
            <Building2 className="h-6 w-6" />
            Companies
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage tenant companies on the platform
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-company">
              <Plus className="h-4 w-4 mr-2" />
              New Company
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Company</DialogTitle>
              <DialogDescription>
                Add a new tenant company and optionally create its first owner account.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="name">Company Name</Label>
                <Input
                  id="name"
                  data-testid="input-company-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  data-testid="input-company-slug"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="acme-cooling"
                />
              </div>
              <div>
                <Label htmlFor="email">Company Email</Label>
                <Input
                  id="email"
                  data-testid="input-company-email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="border-t pt-3 space-y-3">
                <p className="text-sm font-medium">Owner account (optional)</p>
                <div>
                  <Label htmlFor="ownerUsername">Owner Username</Label>
                  <Input
                    id="ownerUsername"
                    data-testid="input-owner-username"
                    value={form.ownerUsername}
                    onChange={(e) => setForm({ ...form, ownerUsername: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="ownerPassword">Owner Password</Label>
                  <Input
                    id="ownerPassword"
                    type="password"
                    data-testid="input-owner-password"
                    value={form.ownerPassword}
                    onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="ownerEmail">Owner Email</Label>
                  <Input
                    id="ownerEmail"
                    data-testid="input-owner-email"
                    value={form.ownerEmail}
                    onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!form.name || !form.slug || createMutation.isPending}
                data-testid="button-submit-company"
              >
                {createMutation.isPending ? "Creating..." : "Create Company"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Companies</CardTitle>
          <CardDescription>{companies.length} companies on the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : companies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No companies yet. Create the first one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                companies.map((company) => (
                  <TableRow key={company.id} data-testid={`row-company-${company.id}`}>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell>{company.slug}</TableCell>
                    <TableCell>{company.email || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={company.status === "active" ? "default" : "secondary"} className="capitalize">
                        {company.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {company.dateCreated ? new Date(company.dateCreated).toLocaleDateString() : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

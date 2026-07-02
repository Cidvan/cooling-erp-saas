import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Client, InsertClient } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Trash2 } from "lucide-react";

interface ClientFormProps {
  isOpen: boolean;
  onClose: () => void;
  onClientCreated?: (client: Client) => void;
  client?: Client; // For editing existing clients
}

export default function ClientForm({ isOpen, onClose, onClientCreated, client }: ClientFormProps) {
  const [formData, setFormData] = useState<{name: string; company: string; email: string; phones: string[]; address: string; clientType: string; firstTransactionDate?: string; status: string}>({
    name: client?.name || "",
    company: client?.company || "",
    email: client?.email || "",
    phones: Array.isArray(client?.phone) && client.phone.length > 0 ? client.phone : client?.phone ? [String(client.phone)] : [""],
    address: client?.address || "",
    clientType: client?.clientType || "residential",
    firstTransactionDate: client?.firstTransactionDate ? new Date(client.firstTransactionDate).toISOString().split('T')[0] : "",
    status: client?.status || "active"
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Sync form data when client prop changes (for editing)
  useEffect(() => {
    if (isOpen && client) {
      setFormData({
        name: client.name || "",
        company: client.company || "",
        email: client.email || "",
        phones: Array.isArray(client.phone) && client.phone.length > 0 ? client.phone : client.phone ? [String(client.phone)] : [""],
        address: client.address || "",
        clientType: client.clientType || "residential",
        firstTransactionDate: client.firstTransactionDate ? new Date(client.firstTransactionDate).toISOString().split('T')[0] : "",
        status: client.status || "active"
      });
    } else if (isOpen && !client) {
      // Reset form for new client
      resetForm();
    }
  }, [client, isOpen]);

  const mutation = useMutation({
    mutationFn: async (data: InsertClient) => {
      if (client) {
        return apiRequest('PUT', `/api/clients/${client.id}`, data);
      } else {
        return apiRequest('POST', '/api/clients', data);
      }
    },
    onSuccess: (newClient) => {
      toast({
        title: "Success",
        description: client ? "Client updated successfully" : "Client created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/analytics'] });
      onClientCreated?.(newClient);
      onClose();
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: client ? "Failed to update client" : "Failed to create client",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      company: "",
      email: "",
      phones: [""],
      address: "",
      clientType: "residential",
      firstTransactionDate: "",
      status: "active"
    });
  };

  const addPhone = () => setFormData(prev => ({ ...prev, phones: [...prev.phones, ""] }));
  const removePhone = (index: number) => setFormData(prev => ({ ...prev, phones: prev.phones.filter((_, i) => i !== index) }));
  const updatePhone = (index: number, value: string) => setFormData(prev => {
    const phones = [...prev.phones];
    phones[index] = value;
    return { ...prev, phones };
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const filledPhones = formData.phones.filter(p => p.trim() !== "");
    if (!formData.name || !formData.email || filledPhones.length === 0 || !formData.address) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const submitData: InsertClient = {
      name: formData.name,
      company: formData.company || null,
      email: formData.email,
      phone: filledPhones,
      address: formData.address,
      clientType: formData.clientType || "residential",
      firstTransactionDate: formData.firstTransactionDate ? new Date(formData.firstTransactionDate) : null,
      status: formData.status || "active"
    };

    mutation.mutate(submitData);
  };

  const handleClose = () => {
    onClose();
    if (!client) {
      resetForm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? "Edit Client" : "Add New Client"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Client full name"
                required
                data-testid="input-client-name"
              />
            </div>
            
            <div>
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                placeholder="Company name (optional)"
                data-testid="input-client-company"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="client@email.com"
                required
                data-testid="input-client-email"
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Phone *</Label>
                <Button type="button" size="icon" variant="ghost" onClick={addPhone} data-testid="button-add-phone">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-col gap-2">
                {formData.phones.map((phone, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={phone}
                      onChange={(e) => updatePhone(index, e.target.value)}
                      placeholder="+63 912 345 6789"
                      data-testid={`input-client-phone-${index}`}
                    />
                    {formData.phones.length > 1 && (
                      <Button type="button" size="icon" variant="ghost" onClick={() => removePhone(index)} data-testid={`button-remove-phone-${index}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address *</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Complete address"
              required
              data-testid="textarea-client-address"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="clientType">Client Type</Label>
              <Select 
                value={formData.clientType || "residential"} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, clientType: value as any }))}
              >
                <SelectTrigger data-testid="select-client-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                  <SelectItem value="establishment">Establishment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="firstTransactionDate">First Transaction Date</Label>
              <Input
                id="firstTransactionDate"
                type="date"
                value={formData.firstTransactionDate}
                onChange={(e) => setFormData(prev => ({ ...prev, firstTransactionDate: e.target.value }))}
                data-testid="input-client-first-transaction-date"
              />
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status || "active"} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
              >
                <SelectTrigger data-testid="select-client-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              data-testid="button-cancel-client"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={mutation.isPending}
              data-testid="button-save-client"
            >
              {mutation.isPending ? "Saving..." : (client ? "Update Client" : "Create Client")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
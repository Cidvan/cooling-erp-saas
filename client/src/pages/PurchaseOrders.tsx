import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PurchaseOrder, PurchaseOrderItem } from "@shared/schema";
import { Plus, Trash2, FileText } from "lucide-react";
import { format } from "date-fns";
import { useCurrency } from "@/hooks/use-currency";

interface POItem {
  qty: number;
  particulars: string;
  unitPrice: number;
  amount: number;
}

export default function PurchaseOrders() {
  const { formatCurrency, symbol: currencySymbol } = useCurrency();
  const { toast } = useToast();
  const [currentPOId, setCurrentPOId] = useState<string | null>(null);

  // Form state
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [supplierName, setSupplierName] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");
  const [attention, setAttention] = useState("");
  const [discount, setDiscount] = useState("0");
  const [paymentStatus, setPaymentStatus] = useState<string>("pending");
  
  // Item input state
  const [itemQty, setItemQty] = useState("1");
  const [itemParticulars, setItemParticulars] = useState("");
  const [itemUnitPrice, setItemUnitPrice] = useState("");
  
  // Items list
  const [items, setItems] = useState<POItem[]>([]);

  // Convert to Payable dialog state
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [bankDetails, setBankDetails] = useState("");

  // Fetch purchase orders
  const { data: purchaseOrders = [] } = useQuery<PurchaseOrder[]>({
    queryKey: ['/api/purchase-orders'],
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const totalUnits = items.reduce((sum, item) => sum + item.qty, 0);
      const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
      const discountAmount = parseFloat(discount) || 0;
      const grandTotal = subtotal - discountAmount;

      const poData = {
        date: new Date(date),
        supplierName,
        supplierAddress,
        attention,
        totalUnits,
        discount: discountAmount.toFixed(2),
        grandTotal: grandTotal.toFixed(2),
        status: 'draft',
        paymentStatus,
        items: items.map((item, index) => ({
          qty: item.qty,
          particulars: item.particulars,
          unitPrice: item.unitPrice.toFixed(2),
          amount: item.amount.toFixed(2),
          orderIndex: index,
        })),
      };

      if (currentPOId) {
        return await fetch(`/api/purchase-orders/${currentPOId}`, {
          method: 'PATCH',
          body: JSON.stringify(poData),
          headers: { 'Content-Type': 'application/json' },
        }).then(res => res.json());
      } else {
        return await fetch('/api/purchase-orders', {
          method: 'POST',
          body: JSON.stringify(poData),
          headers: { 'Content-Type': 'application/json' },
        }).then(res => res.json());
      }
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts-payables'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/analytics'] });
      toast({
        title: "Success",
        description: `Purchase order ${data.poNumber} ${currentPOId ? 'updated' : 'created'} successfully`,
      });
      setCurrentPOId(data.id);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save purchase order",
        variant: "destructive",
      });
    },
  });

  const addItem = () => {
    const qty = parseInt(itemQty) || 1;
    const unitPrice = parseFloat(itemUnitPrice) || 0;
    const amount = qty * unitPrice;

    if (!itemParticulars.trim() || unitPrice <= 0) {
      toast({
        title: "Invalid Item",
        description: "Please provide particulars and valid unit price",
        variant: "destructive",
      });
      return;
    }

    setItems([...items, {
      qty,
      particulars: itemParticulars,
      unitPrice,
      amount,
    }]);

    // Clear inputs
    setItemQty("1");
    setItemParticulars("");
    setItemUnitPrice("");
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setCurrentPOId(null);
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setSupplierName("");
    setSupplierAddress("");
    setAttention("");
    setDiscount("0");
    setPaymentStatus("pending");
    setItems([]);
    setItemQty("1");
    setItemParticulars("");
    setItemUnitPrice("");
  };

  const createNew = () => {
    if (items.length > 0 || supplierName.trim()) {
      if (!confirm("Are you sure you want to create a new purchase order? Any unsaved changes will be lost.")) {
        return;
      }
    }
    clearAll();
  };

  const handleSave = () => {
    if (!supplierName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide supplier name",
        variant: "destructive",
      });
      return;
    }

    if (!supplierAddress.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide supplier address",
        variant: "destructive",
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one item",
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate();
  };

  const convertToPayable = () => {
    if (!currentPOId) {
      toast({
        title: "No Purchase Order",
        description: "Please save the purchase order first before converting to payable",
        variant: "destructive",
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: "No Items",
        description: "Please add items before converting to payable",
        variant: "destructive",
      });
      return;
    }

    setShowConvertDialog(true);
  };

  // Mutation for converting to payable
  const convertMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/purchase-orders/${currentPOId}/convert-to-payable`, {
        method: 'POST',
        body: JSON.stringify({ bankDetails }),
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts-payables'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/analytics'] });
      toast({
        title: "Success",
        description: `Converted to Accounts Payable ${data.apNumber}`,
      });
      setShowConvertDialog(false);
      setBankDetails("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to convert to payable",
        variant: "destructive",
      });
    },
  });

  const handleConvert = () => {
    convertMutation.mutate();
  };

  const generatePDF = () => {
    toast({
      title: "Coming Soon",
      description: "PDF generation feature will be implemented soon",
    });
  };

  // Calculate totals
  const totalUnits = items.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const discountAmount = parseFloat(discount) || 0;
  const grandTotal = subtotal - discountAmount;

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
        <p className="text-muted-foreground mt-1">Create and manage supplier purchase orders</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Main Form */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Supplier Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary">Supplier Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentPOId && (
                  <div>
                    <Label>Purchase Order Number</Label>
                    <Input
                      value={purchaseOrders.find(po => po.id === currentPOId)?.poNumber || "Auto-generated"}
                      disabled
                      data-testid="input-po-number"
                      className="bg-muted"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    data-testid="input-date"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="supplier-name">Purchase Order To (Supplier Name)</Label>
                <Input
                  id="supplier-name"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="Enter supplier name"
                  data-testid="input-supplier-name"
                />
              </div>

              <div>
                <Label htmlFor="supplier-address">Address of Supplier</Label>
                <Textarea
                  id="supplier-address"
                  value={supplierAddress}
                  onChange={(e) => setSupplierAddress(e.target.value)}
                  placeholder="Enter supplier address"
                  data-testid="input-supplier-address"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="attention">Attention</Label>
                <Input
                  id="attention"
                  value={attention}
                  onChange={(e) => setAttention(e.target.value)}
                  placeholder="Enter attention (optional)"
                  data-testid="input-attention"
                />
              </div>

              <div>
                <Label htmlFor="payment-status">Payment Status</Label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger id="payment-status" data-testid="select-payment-status">
                    <SelectValue placeholder="Select payment status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Items Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary">Items Details</h3>
              
              {/* Add Item Inputs */}
              <Card className="bg-primary/5">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                    <div>
                      <Label htmlFor="item-qty">QTY</Label>
                      <Input
                        id="item-qty"
                        type="number"
                        min="1"
                        value={itemQty}
                        onChange={(e) => setItemQty(e.target.value)}
                        data-testid="input-item-qty"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="item-particulars">Particulars</Label>
                      <Input
                        id="item-particulars"
                        value={itemParticulars}
                        onChange={(e) => setItemParticulars(e.target.value)}
                        placeholder="Item description"
                        data-testid="input-item-particulars"
                      />
                    </div>
                    <div>
                      <Label htmlFor="item-unit-price">Unit Price</Label>
                      <Input
                        id="item-unit-price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={itemUnitPrice}
                        onChange={(e) => setItemUnitPrice(e.target.value)}
                        placeholder="0.00"
                        data-testid="input-item-unit-price"
                      />
                    </div>
                    <Button 
                      onClick={addItem}
                      data-testid="button-add-item"
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Items Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">QTY</TableHead>
                      <TableHead>Particulars</TableHead>
                      <TableHead className="w-32">Unit Price</TableHead>
                      <TableHead className="w-32">Amount</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No items added yet. Use the form above to add items.
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item, index) => (
                        <TableRow key={index} data-testid={`row-item-${index}`}>
                          <TableCell data-testid={`text-qty-${index}`}>{item.qty}</TableCell>
                          <TableCell data-testid={`text-particulars-${index}`}>{item.particulars}</TableCell>
                          <TableCell data-testid={`text-unit-price-${index}`}>
                            {formatCurrency(item.unitPrice)}
                          </TableCell>
                          <TableCell data-testid={`text-amount-${index}`}>
                            {formatCurrency(item.amount)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(index)}
                              data-testid={`button-remove-item-${index}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Summary Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary">Summary</h3>
              
              <div className="bg-primary/5 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Number of Units:</span>
                  <span className="font-bold text-lg" data-testid="text-total-units">{totalUnits}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="font-medium">Subtotal:</span>
                  <span className="font-bold text-lg" data-testid="text-subtotal">
                    {formatCurrency(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between items-center gap-4">
                  <Label htmlFor="discount">Less Discount:</Label>
                  <div className="flex items-center gap-2">
                    <span>{currencySymbol}</span>
                    <Input
                      id="discount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="w-32"
                      data-testid="input-discount"
                    />
                  </div>
                </div>
                
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xl">Grand Total:</span>
                    <span className="font-bold text-2xl text-primary" data-testid="text-grand-total">
                      {formatCurrency(grandTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4 border-t">
              <Button
                onClick={convertToPayable}
                variant="secondary"
                data-testid="button-convert-to-payable"
              >
                Convert to Payable
              </Button>
              
              <Button
                onClick={createNew}
                variant="outline"
                data-testid="button-create-new"
              >
                Create New Purchase Order
              </Button>
              
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                data-testid="button-save"
              >
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
              
              <Button
                onClick={clearAll}
                variant="outline"
                data-testid="button-clear-all"
              >
                Clear All
              </Button>
              
              <Button
                onClick={generatePDF}
                variant="outline"
                data-testid="button-generate-pdf"
              >
                <FileText className="w-4 h-4 mr-2" />
                Generate PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Purchase Orders List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Purchase Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Grand Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No purchase orders yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    purchaseOrders.map((po) => (
                      <TableRow key={po.id} data-testid={`row-po-${po.id}`}>
                        <TableCell className="font-medium" data-testid={`text-po-number-${po.id}`}>
                          {po.poNumber}
                        </TableCell>
                        <TableCell data-testid={`text-date-${po.id}`}>
                          {format(new Date(po.date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell data-testid={`text-supplier-${po.id}`}>{po.supplierName}</TableCell>
                        <TableCell data-testid={`text-grand-total-${po.id}`}>
                          {formatCurrency(po.grandTotal)}
                        </TableCell>
                        <TableCell data-testid={`text-status-${po.id}`}>
                          <span className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                            {po.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Convert to Payable Dialog */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent data-testid="dialog-convert-payable">
          <DialogHeader>
            <DialogTitle>Convert to Accounts Payable</DialogTitle>
            <DialogDescription>
              Enter the supplier's bank details to convert this purchase order to accounts payable.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bank-details">Supplier Bank Details</Label>
              <Textarea
                id="bank-details"
                placeholder="Enter bank name, account number, account name, etc."
                value={bankDetails}
                onChange={(e) => setBankDetails(e.target.value)}
                rows={4}
                data-testid="input-bank-details"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConvertDialog(false);
                setBankDetails("");
              }}
              data-testid="button-cancel-convert"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConvert}
              disabled={convertMutation.isPending}
              data-testid="button-confirm-convert"
            >
              {convertMutation.isPending ? 'Converting...' : 'Convert to Payable'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

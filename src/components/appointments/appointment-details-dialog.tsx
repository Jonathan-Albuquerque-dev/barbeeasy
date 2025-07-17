'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getProducts, updateAppointmentProducts, Product, AppointmentDocument, deleteAppointment } from '@/lib/data';

import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { Separator } from '../ui/separator';

type SoldProduct = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
};

type PopulatedAppointment = AppointmentDocument & {
  client: { id: string; name: string; avatarUrl: string; };
  barber: { id: string; name: string; };
};
interface AppointmentDetailsDialogProps {
  appointment: PopulatedAppointment;
  onAppointmentUpdate: () => void;
  children: React.ReactNode;
}

export function AppointmentDetailsDialog({ appointment, onAppointmentUpdate, children }: AppointmentDetailsDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<SoldProduct[]>([]);

  // Form state for adding a new product
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  
  useEffect(() => {
    if (open && user?.uid) {
      getProducts(user.uid).then(setAvailableProducts);
      // Initialize cart with products already sold in this appointment
      setCart(appointment.soldProducts || []);
    }
  }, [open, user, appointment.soldProducts]);

  const handleAddProductToCart = () => {
    if (!selectedProductId || quantity <= 0) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Selecione um produto e a quantidade.' });
      return;
    }
    
    const productToAdd = availableProducts.find(p => p.id === selectedProductId);
    if (!productToAdd) return;
    
    // Check stock before adding
    const existingCartItem = cart.find(item => item.productId === selectedProductId);
    const quantityInCart = existingCartItem ? existingCartItem.quantity : 0;
    
    if (productToAdd.stock < quantityInCart + quantity) {
        toast({ 
            variant: 'destructive', 
            title: 'Estoque Insuficiente', 
            description: `Apenas ${productToAdd.stock} unidades de "${productToAdd.name}" disponíveis.` 
        });
        return;
    }

    // Check if product is already in cart
    const existingCartItemIndex = cart.findIndex(item => item.productId === selectedProductId);

    if (existingCartItemIndex > -1) {
      // Update quantity if product is already in cart
      const updatedCart = [...cart];
      updatedCart[existingCartItemIndex].quantity += quantity;
      setCart(updatedCart);
    } else {
      // Add new product to cart
      setCart([...cart, {
        productId: productToAdd.id,
        name: productToAdd.name,
        quantity: quantity,
        price: productToAdd.price,
      }]);
    }

    // Reset form
    setSelectedProductId('');
    setQuantity(1);
  };
  
  const handleRemoveProduct = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };
  
  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await updateAppointmentProducts(user.uid, appointment.id, cart);
      toast({
        title: 'Sucesso!',
        description: 'Venda de produtos atualizada.',
      });
      onAppointmentUpdate();
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível salvar os produtos.',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (!user) return;
    setDeleteLoading(true);
    try {
      await deleteAppointment(user.uid, appointment.id);
      toast({
        title: 'Sucesso!',
        description: 'O agendamento foi excluído.',
      });
      onAppointmentUpdate();
      setOpen(false); // Close the main dialog
    } catch (error) {
        console.error(error);
        toast({
            variant: 'destructive',
            title: 'Erro',
            description: 'Não foi possível excluir o agendamento.',
        });
    } finally {
        setDeleteLoading(false);
    }
  };


  const totalProductsValue = useMemo(() => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cart]);


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes do Agendamento</DialogTitle>
          <DialogDescription>
            Veja as informações do agendamento e adicione produtos vendidos.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <p className="font-semibold">Cliente</p>
                    <p className="text-muted-foreground">{appointment.client.name}</p>
                </div>
                <div>
                    <p className="font-semibold">Profissional</p>
                    <p className="text-muted-foreground">{appointment.barber.name}</p>
                </div>
                 <div>
                    <p className="font-semibold">Serviço</p>
                    <p className="text-muted-foreground">{appointment.service}</p>
                </div>
                <div>
                    <p className="font-semibold">Data e Hora</p>
                    <p className="text-muted-foreground">{new Date(`${appointment.date}T${appointment.time}`).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short'})}</p>
                </div>
            </div>

            <Separator />

            <div>
                <h3 className="text-lg font-semibold mb-4">Venda de Produtos</h3>
                <div className="p-4 border rounded-lg space-y-4">
                    {/* Add product section */}
                    <div className="flex items-end gap-2">
                        <div className="flex-grow">
                            <label className="text-sm font-medium">Produto</label>
                            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                                <SelectTrigger>
                                <SelectValue placeholder="Selecione um produto" />
                                </SelectTrigger>
                                <SelectContent>
                                {availableProducts.map(p => <SelectItem key={p.id} value={p.id} disabled={p.stock === 0}>{p.name} (R${p.price.toFixed(2)}) - {p.stock} em estoque</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="w-24">
                            <label className="text-sm font-medium">Qtd.</label>
                            <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}/>
                        </div>
                        <Button onClick={handleAddProductToCart} size="icon" disabled={!selectedProductId}>
                           <PlusCircle className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Cart section */}
                    <div className="space-y-2">
                        <h4 className="font-medium">Produtos na Venda</h4>
                        {cart.length > 0 ? (
                           <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                        <TableHead>Produto</TableHead>
                                        <TableHead className="text-center">Qtd.</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {cart.map(item => (
                                            <TableRow key={item.productId}>
                                                <TableCell className="font-medium">{item.name}</TableCell>
                                                <TableCell className="text-center">{item.quantity}</TableCell>
                                                <TableCell className="text-right">R${(item.price * item.quantity).toFixed(2)}</TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveProduct(item.productId)}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                           </div>
                        ) : (
                            <p className="text-sm text-center text-muted-foreground py-4">Nenhum produto adicionado.</p>
                        )}
                    </div>
                     {cart.length > 0 && (
                        <div className="text-right font-bold text-lg">
                            Total dos Produtos: R${totalProductsValue.toFixed(2)}
                        </div>
                    )}
                </div>
            </div>
        </div>
        
        <DialogFooter className="flex-col-reverse gap-2 pt-4 border-t sm:flex-row sm:justify-between">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir Agendamento
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente o agendamento da sua base de dados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleteLoading}
                            className={buttonVariants({ variant: "destructive" })}
                        >
                            {deleteLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sim, excluir'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <DialogClose asChild>
                    <Button type="button" variant="outline">Fechar</Button>
                </DialogClose>
                <Button onClick={handleSave} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Venda'}
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getProducts, getClients, getStaff, addClient, createStandaloneSale, Product, Client, Staff } from '@/lib/data';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2, PlusCircle, Trash2, Search, Package, User, ShoppingCart } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';

type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
  imageUrl?: string;
};

const salesSchema = z.object({
  staffId: z.string().min(1, 'Selecione o vendedor.'),
  clientType: z.enum(['existing', 'new']).default('existing'),
  clientId: z.string().optional(),
  newClientName: z.string().optional(),
  paymentMethod: z.string().min(1, 'Selecione a forma de pagamento.'),
}).superRefine((data, ctx) => {
    if (data.clientType === 'existing' && !data.clientId) {
        ctx.addIssue({ code: 'custom', message: 'Selecione um cliente.', path: ['clientId'] });
    }
    if (data.clientType === 'new' && (!data.newClientName || data.newClientName.length < 2)) {
         ctx.addIssue({ code: 'custom', message: 'O nome do novo cliente é obrigatório.', path: ['newClientName'] });
    }
});
type SalesFormValues = z.infer<typeof salesSchema>;

export function SalesTerminal() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  const form = useForm<SalesFormValues>({
    resolver: zodResolver(salesSchema),
    defaultValues: {
      staffId: '',
      clientType: 'existing',
      clientId: '',
      newClientName: '',
      paymentMethod: 'Dinheiro',
    },
  });

  const clientType = form.watch('clientType');

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [fetchedProducts, fetchedClients, fetchedStaff] = await Promise.all([
        getProducts(user.uid),
        getClients(user.uid),
        getStaff(user.uid),
      ]);
      setProducts(fetchedProducts);
      setClients(fetchedClients.map(c => ({...c, id: c.id, name: c.name})));
      setStaff(fetchedStaff);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar os dados iniciais.' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredProducts = useMemo(() => {
    return products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [cart]);

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.productId === product.id);
    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        setCart(cart.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      } else {
        toast({ variant: 'destructive', title: 'Estoque Esgotado', description: `Não há mais estoque de ${product.name}.` });
      }
    } else {
      if (product.stock > 0) {
        setCart([...cart, { productId: product.id, name: product.name, price: product.price, quantity: 1, stock: product.stock, imageUrl: product.imageUrl }]);
      } else {
        toast({ variant: 'destructive', title: 'Estoque Esgotado', description: `Não há mais estoque de ${product.name}.` });
      }
    }
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    const item = cart.find(i => i.productId === productId);
    if (!item) return;

    if (newQuantity > 0 && newQuantity <= item.stock) {
      setCart(cart.map(i => i.productId === productId ? { ...i, quantity: newQuantity } : i));
    } else if (newQuantity > item.stock) {
        toast({ variant: 'destructive', title: 'Estoque Esgotado', description: `Apenas ${item.stock} unidades disponíveis.` });
    } else {
      removeFromCart(productId);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const onSubmit = async (data: SalesFormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }
    if (cart.length === 0) {
      toast({ variant: 'destructive', title: 'Carrinho Vazio', description: 'Adicione produtos antes de finalizar a venda.' });
      return;
    }
    
    form.clearErrors();
    setLoading(true);
    
    try {
      let finalClientId = data.clientId;
      if (data.clientType === 'new' && data.newClientName) {
         finalClientId = await addClient(user.uid, {
          name: data.newClientName,
          email: '', phone: '', address: '', loyaltyStatus: 'Bronze', loyaltyPoints: 0,
          avatarUrl: `https://placehold.co/400x400.png`,
          preferences: { preferredServices: [], preferredBarber: 'Nenhum', notes: 'Cliente de balcão (venda avulsa).' },
          createdAt: new Date(),
        });
        // We need to refetch clients so the new one is available for future sales without a page refresh
        getClients(user.uid).then(setClients);
      }

      if (!finalClientId) {
          throw new Error("ID do cliente é inválido.");
      }
      
      const saleData = {
        clientId: finalClientId,
        barberId: data.staffId,
        paymentMethod: data.paymentMethod,
        cart: cart,
      };

      await createStandaloneSale(user.uid, saleData);

      toast({ title: 'Sucesso!', description: 'Venda realizada com sucesso.' });
      setCart([]);
      form.reset();
      // Refetch products to update stock numbers
      getProducts(user.uid).then(setProducts);

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro na Venda', description: error.message || 'Não foi possível concluir a venda.' });
    } finally {
      setLoading(false);
    }
  };


  if (loading && products.length === 0) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Produtos Disponíveis</CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar produto..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredProducts.map(product => (
                    <Card key={product.id} className="overflow-hidden">
                       <div className="relative aspect-square w-full">
                         <Image src={product.imageUrl || 'https://placehold.co/400x400.png'} alt={product.name} fill className="object-cover" data-ai-hint="product package"/>
                       </div>
                       <div className="p-3">
                         <h3 className="font-semibold truncate">{product.name}</h3>
                         <p className="text-sm text-muted-foreground">Estoque: {product.stock}</p>
                         <div className="flex justify-between items-center mt-2">
                           <p className="font-bold text-primary">R${product.price.toFixed(2)}</p>
                           <Button size="icon" variant="outline" onClick={() => addToCart(product)} disabled={product.stock === 0}>
                             <PlusCircle className="h-4 w-4" />
                           </Button>
                         </div>
                       </div>
                    </Card>
                  ))}
                </div>
                {filteredProducts.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum produto encontrado.</p>}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1 sticky top-24">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-6 w-6" /> Resumo da Venda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScrollArea className="h-48 pr-4">
                {cart.length > 0 ? (
                  <div className="space-y-4">
                    {cart.map(item => (
                      <div key={item.productId} className="flex items-center gap-3">
                        <Image src={item.imageUrl || 'https://placehold.co/100x100.png'} alt={item.name} width={48} height={48} className="rounded-md object-cover" data-ai-hint="product package" />
                        <div className="flex-grow">
                          <p className="font-medium truncate">{item.name}</p>
                          <p className="text-sm text-muted-foreground">R${item.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Input type="number" className="w-16 h-8 text-center" value={item.quantity} onChange={e => updateQuantity(item.productId, Number(e.target.value))} min="1" max={item.stock} />
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeFromCart(item.productId)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-10">
                    <p>Seu carrinho está vazio.</p>
                  </div>
                )}
              </ScrollArea>
              
              <Separator />

              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>R${cartTotal.toFixed(2)}</span>
              </div>

              <div className="space-y-4 pt-4 border-t">
                 <FormField
                    control={form.control}
                    name="staffId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Vendedor</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger><SelectValue placeholder="Selecione um vendedor" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>{staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                
                <FormField
                    control={form.control}
                    name="clientType"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Cliente</FormLabel>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4 pt-1">
                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="existing" id="c-existing" /></FormControl><Label htmlFor="c-existing" className="font-normal !mt-0">Existente</Label></FormItem>
                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="new" id="c-new" /></FormControl><Label htmlFor="c-new" className="font-normal !mt-0">Novo (Balcão)</Label></FormItem>
                            </RadioGroup>
                        </FormItem>
                    )}
                />

                {clientType === 'existing' ? (
                     <FormField
                        control={form.control}
                        name="clientId"
                        render={({ field }) => (
                            <FormItem>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger></FormControl>
                                    <SelectContent><ScrollArea className="h-48">{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</ScrollArea></SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                ) : (
                     <FormField
                        control={form.control}
                        name="newClientName"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl><Input placeholder="Nome do novo cliente" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
                
                <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Forma de Pagamento</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                                <SelectItem value="Cartão de Crédito/Débito">Cartão de Crédito/Débito</SelectItem>
                                <SelectItem value="Pix">Pix</SelectItem>
                            </SelectContent>
                        </Select>
                         <FormMessage />
                        </FormItem>
                    )}
                />
              </div>

            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={loading || cart.length === 0}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Finalizar Venda'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </Form>
  );
}

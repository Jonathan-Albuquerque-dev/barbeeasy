
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { addProduct } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Edit, Image as ImageIcon } from 'lucide-react';
import { ImageCropper } from '../ui/image-cropper';
import Image from 'next/image';

const productSchema = z.object({
  name: z.string().min(2, { message: 'O nome do produto é obrigatório.' }),
  description: z.string().min(10, { message: 'A descrição deve ter pelo menos 10 caracteres.' }),
  imageUrl: z.string().optional(),
  purchasePrice: z.coerce.number().positive({ message: 'O preço de compra deve ser um número positivo.' }),
  price: z.coerce.number().positive({ message: 'O preço de venda deve ser um número positivo.' }),
  stock: z.coerce.number().int().min(0, { message: 'O estoque não pode ser negativo.' }),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface AddProductDialogProps {
  onProductAdded: () => void;
  children: React.ReactNode;
}

export function AddProductDialog({ onProductAdded, children }: AddProductDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [newImageDataUrl, setNewImageDataUrl] = useState<string | null>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      imageUrl: '',
      purchasePrice: '' as any,
      price: '' as any,
      stock: '' as any,
    },
  });
  
  const { setValue, watch, reset } = form;

  const handleCroppedImage = (dataUrl: string) => {
    setNewImageDataUrl(dataUrl);
    setValue('imageUrl', dataUrl, { shouldDirty: true });
    setIsCropperOpen(false);
  };

  const onSubmit = async (data: ProductFormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Você precisa estar logado para adicionar um produto.' });
      return;
    }

    setLoading(true);
    try {
      const productData = {
          ...data,
          imageUrl: newImageDataUrl || 'https://placehold.co/600x400.png',
      };
      await addProduct(user.uid, productData);
      toast({
        title: 'Sucesso!',
        description: 'O novo produto foi adicionado.',
      });
      onProductAdded();
      setOpen(false);
      reset();
      setNewImageDataUrl(null);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro ao adicionar produto',
        description: 'Não foi possível salvar o produto. Tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const watchedImageUrl = watch('imageUrl');

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
            reset();
            setNewImageDataUrl(null);
        }
      }}>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Produto</DialogTitle>
            <DialogDescription>
              Preencha os detalhes do novo produto para venda.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="relative aspect-video w-full bg-muted rounded-md flex items-center justify-center">
                  <Image src={newImageDataUrl || watchedImageUrl || 'https://placehold.co/600x400.png'} alt="Prévia do produto" fill className="object-cover rounded-md" data-ai-hint="product cosmetics" />
                  <Button type="button" variant="secondary" onClick={() => setIsCropperOpen(true)} className="absolute bottom-2 right-2">
                    <Edit className="mr-2 h-4 w-4" /> Alterar Foto
                  </Button>
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Produto</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Pomada Modeladora" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descreva o produto..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                  <FormField
                  control={form.control}
                  name="purchasePrice"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Preço de Compra (R$)</FormLabel>
                      <FormControl>
                          <Input type="number" step="0.01" placeholder="Ex: 25.00" {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
                  <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Preço de Venda (R$)</FormLabel>
                      <FormControl>
                          <Input type="number" step="0.01" placeholder="Ex: 55.00" {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
              </div>
              <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Estoque</FormLabel>
                      <FormControl>
                          <Input type="number" step="1" placeholder="Ex: 10" {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Produto'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <ImageCropper
        isOpen={isCropperOpen}
        onClose={() => setIsCropperOpen(false)}
        onImageCropped={handleCroppedImage}
      />
    </>
  );
}

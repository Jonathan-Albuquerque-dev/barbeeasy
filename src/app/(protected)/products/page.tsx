'use client';

import { getProducts } from "@/lib/data";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign, PlusCircle, ShoppingCart, Package } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState, useCallback } from "react";
import { AddProductDialog } from "@/components/products/add-product-dialog";
import Image from 'next/image';
import { Badge } from "@/components/ui/badge";

type Product = Awaited<ReturnType<typeof getProducts>>[0];

export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    if (user?.uid) {
      const fetchedProducts = await getProducts(user.uid);
      setProducts(fetchedProducts);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.uid) {
        setLoading(true);
        fetchProducts();
    }
  }, [user, fetchProducts]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Venda de Produtos</h1>
          <p className="text-muted-foreground">Gerencie seu estoque de produtos para venda.</p>
        </div>
        <AddProductDialog onProductAdded={fetchProducts}>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Produto
            </Button>
        </AddProductDialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map(product => (
          <Card key={product.id} className="flex flex-col overflow-hidden">
            <CardHeader className="p-0 relative">
                <div className="aspect-square w-full relative bg-muted">
                    <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover"
                        data-ai-hint="product photo"
                    />
                </div>
                 <Badge 
                    variant={product.stock > 5 ? 'secondary' : (product.stock > 0 ? 'default' : 'destructive')}
                    className="absolute top-2 right-2"
                 >
                   {product.stock > 0 ? `${product.stock} em estoque` : 'Fora de estoque'}
                </Badge>
            </CardHeader>
            <CardContent className="flex-grow p-4 space-y-2">
              <CardTitle className="text-xl">{product.name}</CardTitle>
              <CardDescription className="text-sm line-clamp-2 h-10">{product.description}</CardDescription>
              <div className="flex items-center pt-2">
                <DollarSign className="h-5 w-5 mr-2 text-muted-foreground"/>
                <span className="font-semibold text-xl text-foreground">R${product.price.toFixed(2)}</span>
              </div>
            </CardContent>
            <CardFooter className="p-4 pt-0">
              <Button variant="outline" className="w-full" disabled={product.stock === 0}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Adicionar ao Carrinho
              </Button>
            </CardFooter>
          </Card>
        ))}
         {products.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center text-center py-12 rounded-lg border-2 border-dashed">
                <Package className="h-16 w-16 text-muted-foreground" />
                <h2 className="mt-6 text-xl font-semibold">Nenhum Produto Cadastrado</h2>
                <p className="mt-2 text-sm text-muted-foreground">Comece a vender adicionando seu primeiro produto.</p>
            </div>
        )}
      </div>
    </div>
  );
}

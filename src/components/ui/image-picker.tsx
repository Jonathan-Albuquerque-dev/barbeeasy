
'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Camera, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './alert';

interface ImagePickerProps {
  value?: string;
  onChange: (value: string) => void;
  fallbackText: string;
}

const MAX_IMAGE_WIDTH = 1024;
const IMAGE_QUALITY = 0.8;

// Helper function to compress and resize image, returning a Base64 data URL
const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                
                let width = img.width;
                let height = img.height;

                if (width > MAX_IMAGE_WIDTH) {
                    height = (MAX_IMAGE_WIDTH / width) * height;
                    width = MAX_IMAGE_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context'));
                }
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', IMAGE_QUALITY));
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};


export function ImagePicker({ value, onChange, fallbackText }: ImagePickerProps) {
  const [preview, setPreview] = useState<string | undefined>(value);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    setPreview(value);
  }, [value]);
  
  useEffect(() => {
    let stream: MediaStream | null = null;
    const getCameraPermission = async () => {
      if (cameraOpen) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Camera Access Denied',
            description: 'Please enable camera permissions in your browser settings.',
          });
        }
      }
    };
    getCameraPermission();

    return () => {
        // Stop camera stream when component unmounts or dialog closes
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    }
  }, [cameraOpen, toast]);


  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const compressedDataUrl = await compressImage(file);
        setPreview(compressedDataUrl);
        onChange(compressedDataUrl);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erro ao processar imagem',
          description: 'Não foi possível comprimir a imagem selecionada.',
        });
      }
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        let width = video.videoWidth;
        let height = video.videoHeight;

        if (width > MAX_IMAGE_WIDTH) {
            height = (MAX_IMAGE_WIDTH / width) * height;
            width = MAX_IMAGE_WIDTH;
        }
        
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        
        if (context) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
            setPreview(dataUrl);
            onChange(dataUrl);
            setCameraOpen(false);
        }
    }
  };

  const handleSelectFileClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-20 w-20">
        <AvatarImage src={preview} />
        <AvatarFallback>{fallbackText}</AvatarFallback>
      </Avatar>
      <div className="flex-grow space-y-2">
        <Input
          type="file"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png, image/jpeg, image/gif, image/webp"
        />
        <div className="flex flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={handleSelectFileClick} className="w-full sm:w-auto">
                <ImageIcon className="mr-2 h-4 w-4" />
                Selecionar Foto
            </Button>
            
            <Dialog open={cameraOpen} onOpenChange={setCameraOpen}>
                <DialogTrigger asChild>
                    <Button type="button" variant="outline" className="w-full sm:w-auto">
                        <Camera className="mr-2 h-4 w-4" />
                        Tirar Foto
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                    <DialogTitle>Tirar uma foto</DialogTitle>
                    </DialogHeader>
                    <div className="relative mt-4">
                        <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
                        <canvas ref={canvasRef} className="hidden" />
                         {hasCameraPermission === false && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                               <Alert variant="destructive" className="w-3/4">
                                <AlertTitle>Câmera não disponível</AlertTitle>
                                <AlertDescription>
                                    Por favor, habilite a permissão da câmera no seu navegador.
                                </AlertDescription>
                               </Alert>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                    <Button type="button" variant="secondary" onClick={() => setCameraOpen(false)}>Cancelar</Button>
                    <Button type="button" onClick={handleCapture} disabled={!hasCameraPermission}>Capturar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
        <p className="text-xs text-muted-foreground">
          A imagem será otimizada antes do envio.
        </p>
      </div>
    </div>
  );
}

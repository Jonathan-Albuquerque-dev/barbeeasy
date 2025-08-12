
'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, Upload, Scissors, Check, X } from 'lucide-react';

import ReactCrop, { centerCrop, makeAspectCrop, Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useToast } from '@/hooks/use-toast';

interface ImageCropperProps {
  isOpen: boolean;
  onClose: () => void;
  onImageCropped: (dataUrl: string) => void;
}

// Function to get the cropped image as a Data URL
function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop,
  fileName: string
): Promise<string> {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = Math.floor(crop.width * scaleX);
  canvas.height = Math.floor(crop.height * scaleY);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return Promise.reject(new Error('Failed to get canvas context.'));
  }

  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
  canvas.height = Math.floor(crop.height * scaleY * pixelRatio);
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width * scaleX,
    crop.height * scaleY
  );
  
  // Return the Data URL
  return new Promise((resolve) => {
    resolve(canvas.toDataURL('image/jpeg', 0.85)); // Compress to JPEG
  });
}


export function ImageCropper({ isOpen, onClose, onImageCropped }: ImageCropperProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('upload');
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(e.target.files[0]);
      setActiveTab('crop');
    }
  };

  const handleCrop = async () => {
    if (completedCrop && imgRef.current) {
      try {
        const dataUrl = await getCroppedImg(imgRef.current, completedCrop, 'newFile.jpg');
        onImageCropped(dataUrl);
      } catch (e) {
        console.error(e);
      }
    }
  };
  
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const newCrop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        1 / 1, // Aspect ratio 1:1
        width,
        height
      ),
      width,
      height
    );
    setCrop(newCrop);
  };
  
  const getCameraPermission = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setHasCameraPermission(true);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Acesso à Câmera Negado',
        description: 'Por favor, habilite a permissão da câmera nas configurações do seu navegador.',
      });
    }
  };

  const handleCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImgSrc(dataUrl);
        setActiveTab('crop');
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setHasCameraPermission(false);
    }
  };

  const handleDialogClose = () => {
    stopCamera();
    onClose();
    setTimeout(() => {
        setImgSrc('');
        setActiveTab('upload');
    }, 300);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Alterar Foto de Perfil</DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload" disabled={!!imgSrc}>
                    <Upload className="mr-2 h-4 w-4" /> Enviar Arquivo
                </TabsTrigger>
                <TabsTrigger value="camera" onClick={getCameraPermission} disabled={!!imgSrc}>
                    <Camera className="mr-2 h-4 w-4" /> Tirar Foto
                </TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="mt-4 text-center">
                 <Button onClick={() => fileInputRef.current?.click()}>
                    Selecionar da Galeria
                 </Button>
                <Input type="file" accept="image/*" ref={fileInputRef} onChange={onSelectFile} className="hidden"/>
            </TabsContent>
            <TabsContent value="camera" className="mt-4">
                {hasCameraPermission ? (
                    <div className="space-y-4">
                        <video ref={videoRef} className="w-full aspect-video rounded-md" autoPlay muted />
                        <Button className="w-full" onClick={handleCapture}>
                            <Camera className="mr-2 h-4 w-4" /> Capturar Foto
                        </Button>
                    </div>
                ) : <p className="text-center text-muted-foreground">Aguardando permissão da câmera...</p>}
            </TabsContent>
             <TabsContent value="crop" className="mt-4 flex flex-col items-center">
                {imgSrc && (
                <ReactCrop
                    crop={crop}
                    onChange={c => setCrop(c)}
                    onComplete={c => setCompletedCrop(c)}
                    aspect={1}
                >
                    <img ref={imgRef} src={imgSrc} onLoad={onImageLoad} alt="Crop me" style={{ maxHeight: '70vh' }}/>
                </ReactCrop>
                )}
            </TabsContent>
        </Tabs>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline"><X className="mr-2 h-4 w-4" /> Cancelar</Button>
          </DialogClose>
          {activeTab === 'crop' && (
            <Button onClick={handleCrop} disabled={!completedCrop}>
              <Check className="mr-2 h-4 w-4" /> Salvar Foto
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

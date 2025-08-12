// src/components/ui/image-picker.tsx
'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImagePickerProps {
  label: string;
  currentImage: string | null;
  onImageChange: (dataUrl: string | null) => void;
  fallbackText: string;
  className?: string;
}

export function ImagePicker({
  label,
  currentImage,
  onImageChange,
  fallbackText,
  className
}: ImagePickerProps) {
  const [preview, setPreview] = useState<string | null>(currentImage);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setPreview(dataUrl);
        onImageChange(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <Avatar className="h-20 w-20">
        <AvatarImage src={preview || ''} />
        <AvatarFallback>
            <User className="h-8 w-8 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-grow space-y-2">
        <Label>{label}</Label>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={handleButtonClick}>
            <ImageIcon className="mr-2 h-4 w-4" />
            Escolher Arquivo
          </Button>
          <Input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/png, image/jpeg, image/gif"
            onChange={handleFileChange}
          />
        </div>
        <p className="text-xs text-muted-foreground">PNG, JPG ou GIF.</p>
      </div>
    </div>
  );
}

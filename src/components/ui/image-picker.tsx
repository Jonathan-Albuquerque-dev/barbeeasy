
'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ImagePickerProps {
  value?: string;
  onChange: (value: string) => void;
  fallbackText: string;
}

export function ImagePicker({ value, onChange, fallbackText }: ImagePickerProps) {
  const [preview, setPreview] = useState<string | undefined>(value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreview(value);
  }, [value]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPreview(base64String);
        onChange(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-20 w-20">
        <AvatarImage src={preview} />
        <AvatarFallback>{fallbackText}</AvatarFallback>
      </Avatar>
      <div className="flex-grow">
        <Input
          type="file"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png, image/jpeg, image/gif, image/webp"
        />
        <Button type="button" variant="outline" onClick={handleButtonClick}>
          Selecionar Foto
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          Escolha uma imagem do seu dispositivo.
        </p>
      </div>
    </div>
  );
}

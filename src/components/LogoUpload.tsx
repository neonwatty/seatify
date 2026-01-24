'use client';

import { useState, useRef, useCallback } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { showToast } from './toastStore';
import './LogoUpload.css';

interface LogoUploadProps {
  currentLogoUrl?: string | null;
  onLogoChange: (logoDataUrl: string | null) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 500 * 1024; // 500KB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];
const MAX_DIMENSION = 512; // Max width/height in pixels

export function LogoUpload({ currentLogoUrl, onLogoChange, disabled }: LogoUploadProps) {
  const { limits } = useSubscription();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUseCustomLogo = limits.hasCustomLogo;

  const resizeImage = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        let { width, height } = img;

        // Scale down if necessary
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = (height / width) * MAX_DIMENSION;
            width = MAX_DIMENSION;
          } else {
            width = (width / height) * MAX_DIMENSION;
            height = MAX_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;

        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Use PNG for quality, JPEG for photos
          const dataUrl = canvas.toDataURL(file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.9);
          resolve(dataUrl);
        } else {
          reject(new Error('Could not get canvas context'));
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));

      // Read file as data URL
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast('Please upload a PNG, JPEG, or SVG file', 'error');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      showToast('File is too large. Maximum size is 500KB', 'error');
      return;
    }

    setIsUploading(true);

    try {
      // For SVG, just read as data URL directly
      if (file.type === 'image/svg+xml') {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          setPreviewUrl(dataUrl);
          onLogoChange(dataUrl);
          showToast('Logo uploaded successfully', 'success');
        };
        reader.readAsDataURL(file);
      } else {
        // For raster images, resize if needed
        const dataUrl = await resizeImage(file);
        setPreviewUrl(dataUrl);
        onLogoChange(dataUrl);
        showToast('Logo uploaded successfully', 'success');
      }
    } catch (error) {
      console.error('Failed to process logo:', error);
      showToast('Failed to process logo. Please try again.', 'error');
    } finally {
      setIsUploading(false);
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = () => {
    setPreviewUrl(null);
    onLogoChange(null);
    showToast('Logo removed', 'info');
  };

  const handleClick = () => {
    if (!canUseCustomLogo) {
      showToast('Custom logos are available with Pro plan', 'info');
      return;
    }
    fileInputRef.current?.click();
  };

  return (
    <div className={`logo-upload ${disabled ? 'disabled' : ''}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.svg"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={disabled || !canUseCustomLogo}
      />

      {previewUrl ? (
        <div className="logo-preview-container">
          <div className="logo-preview">
            <img src={previewUrl} alt="Custom logo" />
          </div>
          <div className="logo-actions">
            <button
              type="button"
              className="logo-btn change"
              onClick={handleClick}
              disabled={disabled || isUploading || !canUseCustomLogo}
            >
              {isUploading ? 'Uploading...' : 'Change'}
            </button>
            <button
              type="button"
              className="logo-btn remove"
              onClick={handleRemoveLogo}
              disabled={disabled || isUploading}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={`logo-upload-btn ${!canUseCustomLogo ? 'locked' : ''}`}
          onClick={handleClick}
          disabled={disabled || isUploading}
        >
          {isUploading ? (
            <>
              <div className="upload-spinner" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Upload Logo</span>
              {!canUseCustomLogo && (
                <span className="pro-badge">Pro</span>
              )}
            </>
          )}
        </button>
      )}

      <p className="logo-hint">
        PNG, JPEG, or SVG. Max 500KB.
        {!canUseCustomLogo && ' Upgrade to Pro to add your custom logo.'}
      </p>
    </div>
  );
}

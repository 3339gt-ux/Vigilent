'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, RotateCw, Check, X, RefreshCw } from 'lucide-react';

interface ImageCropModalProps {
  imageSrc: string; // dataUrl or url
  imageName: string;
  preferredAspectRatio?: '1:1' | '4:3' | '16:9' | 'free';
  onClose: () => void;
  onConfirm: (croppedBlob: Blob, cropData: { x: number; y: number; width: number; height: number; zoom: number; rotate: number; aspectRatio: string }) => void;
}

export function ImageCropModal({
  imageSrc,
  imageName,
  preferredAspectRatio = 'free',
  onClose,
  onConfirm
}: ImageCropModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // in degrees: 0, 90, 180, 270
  const [aspectRatio, setAspectRatio] = useState<string>(preferredAspectRatio);
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset offset on image rotation or aspect change
  useEffect(() => {
    setOffset({ x: 0, y: 0 });
    setZoom(1);
  }, [rotation, aspectRatio]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const rotateImage = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleConfirm = () => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;

    // We will draw the visible cropped area using canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get actual sizes
    const imgNaturalWidth = img.naturalWidth;
    const imgNaturalHeight = img.naturalHeight;

    // Setup crop area sizing based on active aspect ratio relative to container
    const rect = container.getBoundingClientRect();
    const maskWidth = rect.width * 0.8;
    let maskHeight = maskWidth;

    if (aspectRatio === '4:3') {
      maskHeight = maskWidth * (3 / 4);
    } else if (aspectRatio === '16:9') {
      maskHeight = maskWidth * (9 / 16);
    } else if (aspectRatio === 'free') {
      // Dynamic fitting or default to 4:3/square size
      maskHeight = rect.height * 0.6;
    }

    // Canvas size should be determined by high res image details
    let targetWidth = 800;
    let targetHeight = 800;
    if (aspectRatio === '4:3') {
      targetHeight = 600;
    } else if (aspectRatio === '16:9') {
      targetHeight = 450;
    } else if (aspectRatio === 'free') {
      // Fit dynamically
      targetWidth = imgNaturalWidth;
      targetHeight = imgNaturalHeight;
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Clear background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    // Apply scaling and translations
    ctx.translate(targetWidth / 2, targetHeight / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    // Render scaled/panned version
    // Calculate how the container offsets correspond to high res natural image coordinates
    const displayImgWidth = img.clientWidth * zoom;
    const displayImgHeight = img.clientHeight * zoom;

    const scaleX = imgNaturalWidth / img.clientWidth;
    const scaleY = imgNaturalHeight / img.clientHeight;

    // Compute positions based on offset panned by user
    const finalScale = (targetWidth / maskWidth) * zoom;
    
    // Draw the image
    ctx.drawImage(
      img,
      -imgNaturalWidth / 2 + (offset.x * scaleX) / zoom,
      -imgNaturalHeight / 2 + (offset.y * scaleY) / zoom,
      imgNaturalWidth,
      imgNaturalHeight
    );

    // Restore context
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Alternate canvas draw that is simpler:
    // Just draw target image onto canvas panned & rotated
    const drawCanvas = () => {
      const drawCanvas = document.createElement('canvas');
      drawCanvas.width = targetWidth;
      drawCanvas.height = targetHeight;
      const drawCtx = drawCanvas.getContext('2d');
      if (!drawCtx) return;

      drawCtx.imageSmoothingEnabled = true;
      drawCtx.imageSmoothingQuality = 'high';

      // Translate center
      drawCtx.translate(targetWidth / 2, targetHeight / 2);
      drawCtx.rotate((rotation * Math.PI) / 180);

      // Determine dimensions relative to mask size
      const renderRatio = targetWidth / maskWidth;
      const drawW = img.clientWidth * zoom * renderRatio;
      const drawH = img.clientHeight * zoom * renderRatio;

      const pX = offset.x * renderRatio;
      const pY = offset.y * renderRatio;

      drawCtx.drawImage(img, pX - drawW / 2, pY - drawH / 2, drawW, drawH);

      drawCanvas.toBlob((blob) => {
        if (blob) {
          onConfirm(blob, {
            x: offset.x,
            y: offset.y,
            width: maskWidth,
            height: maskHeight,
            zoom,
            rotate: rotation,
            aspectRatio
          });
        }
      }, 'image/jpeg', 0.9);
    };

    drawCanvas();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-foreground">Crop & Edit Image</h3>
            <p className="text-[10px] text-muted-foreground truncate max-w-[280px] mt-0.5">{imageName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport / Drag Zone */}
        <div 
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="flex-1 relative bg-black/90 min-h-[300px] overflow-hidden flex items-center justify-center cursor-move select-none"
        >
          {/* Mask / Guides overlay */}
          <div 
            className="absolute z-10 border-2 border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] pointer-events-none"
            style={{
              width: '80%',
              aspectRatio: aspectRatio === 'free' ? undefined : aspectRatio === '1:1' ? '1/1' : aspectRatio === '4:3' ? '4/3' : '16/9',
              height: aspectRatio === 'free' ? '60%' : undefined,
              borderRadius: aspectRatio === '1:1' ? '4px' : '2px'
            }}
          >
            {/* Guide Grid lines */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30 pointer-events-none">
              <div className="border-r border-b border-white"></div>
              <div className="border-r border-b border-white"></div>
              <div className="border-b border-white"></div>
              <div className="border-r border-b border-white"></div>
              <div className="border-r border-b border-white"></div>
              <div className="border-b border-white"></div>
              <div className="border-r border-white"></div>
              <div className="border-r border-white"></div>
              <div></div>
            </div>
          </div>

          {/* Active Image */}
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Source image to crop"
            onMouseDown={handleMouseDown}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              maxWidth: '80%',
              maxHeight: '70%',
              objectFit: 'contain'
            }}
            className="pointer-events-auto select-none"
          />
        </div>

        {/* Controls Panel */}
        <div className="p-5 border-t border-border bg-muted/20 space-y-4 text-xs">
          {/* Zoom Slider */}
          <div className="flex items-center gap-3">
            <ZoomIn className="w-4 h-4 text-muted-foreground" />
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-indigo-600 bg-muted border border-border h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Preset Buttons & Rotation */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mr-1">Aspect:</span>
              {(['1:1', '4:3', '16:9', 'free'] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAspectRatio(preset)}
                  className={`px-3 py-1.5 rounded-lg border font-bold text-[10px] transition-all uppercase tracking-wider ${
                    aspectRatio === preset
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                      : 'bg-card border-border hover:bg-muted text-foreground'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={rotateImage}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-card hover:bg-muted border border-border rounded-lg text-foreground font-bold"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Rotate 90°
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setRotation(0);
                  setOffset({ x: 0, y: 0 });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-card hover:bg-muted border border-border rounded-lg text-foreground font-bold"
                title="Reset Crop Settings"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-card hover:bg-muted border border-border text-foreground font-bold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm transition-colors"
            >
              <Check className="w-4 h-4" />
              Apply Crop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { ModelConfig, VideoSource, MediaType } from '../types';

/**
 * Stitches multiple media files (video or image) side-by-side.
 * For videos: uses MediaRecorder (creates .mp4 or .webm).
 * For images: uses Canvas.toBlob (creates .png).
 */
export const stitchMedia = async (
  sources: VideoSource[], 
  models: ModelConfig[],
  mediaType: MediaType,
  onProgress?: (msg: string) => void
): Promise<{ blob: Blob, extension: string }> => {
  return new Promise(async (resolve, reject) => {
    try {
      if (sources.length === 0) throw new Error("No sources provided");

      // ------------------------------------------
      // 1. IMAGE MODE
      // ------------------------------------------
      if (mediaType === 'image') {
         if (onProgress) onProgress("Loading images...");

         const loadPromises = sources.map(src => {
            return new Promise<HTMLImageElement>((res, rej) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.src = src.file ? URL.createObjectURL(src.file) : (src.url || '');
              img.onload = () => res(img);
              img.onerror = () => rej(new Error(`Failed to load image: ${src.name}`));
            });
         });

         const images = await Promise.all(loadPromises);

         // Calculate Canvas Dimensions
         const totalWidth = images.reduce((acc, img) => acc + img.naturalWidth, 0);
         const maxHeight = Math.max(...images.map(img => img.naturalHeight)) || 720;

         const canvas = document.createElement('canvas');
         canvas.width = totalWidth;
         canvas.height = maxHeight;
         const ctx = canvas.getContext('2d');
         if (!ctx) throw new Error("Canvas context failed");

         // Draw Black Background
         ctx.fillStyle = '#000';
         ctx.fillRect(0, 0, canvas.width, canvas.height);

         let currentX = 0;
         images.forEach((img, index) => {
           // Draw Image
           ctx.drawImage(img, currentX, 0);
           
           // Draw Label
           const modelId = sources[index].modelId;
           const modelName = models.find(m => m.id === modelId)?.name || 'Unknown';
           
           ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
           ctx.fillRect(currentX + 10, 10, 200, 30);
           ctx.font = 'bold 16px Arial';
           ctx.fillStyle = '#ffffff';
           ctx.fillText(modelName, currentX + 20, 32);

           currentX += img.naturalWidth;
         });

         // Export as PNG
         canvas.toBlob((blob) => {
            if (blob) {
              // Cleanup
              images.forEach(img => {
                 if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
              });
              resolve({ blob, extension: 'png' });
            } else {
              reject(new Error("Failed to create image blob"));
            }
         }, 'image/png');
         
         return;
      }

      // ------------------------------------------
      // 2. VIDEO MODE
      // ------------------------------------------
      
      const videoElements: HTMLVideoElement[] = [];
      const loadedPromises = sources.map((src) => {
        return new Promise<HTMLVideoElement>((res, rej) => {
          const vid = document.createElement('video');
          vid.crossOrigin = 'anonymous';
          vid.muted = true; 
          vid.src = src.file ? URL.createObjectURL(src.file) : (src.url || '');
          vid.preload = 'auto';
          vid.onloadeddata = () => res(vid);
          vid.onerror = (e) => rej(new Error(`Failed to load video: ${src.name}`));
          vid.load();
        });
      });

      if (onProgress) onProgress("Loading videos...");
      const videos = await Promise.all(loadedPromises);
      videoElements.push(...videos);

      // Stack horizontally
      const totalWidth = videos.reduce((acc, v) => acc + v.videoWidth, 0);
      const maxHeight = Math.max(...videos.map(v => v.videoHeight)) || 720;
      
      const canvas = document.createElement('canvas');
      canvas.width = totalWidth;
      canvas.height = maxHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not get canvas context");

      const stream = (canvas as any).captureStream(30); // 30 FPS
      
      // Prioritize MP4
      const mimeTypes = [
        'video/mp4',
        'video/mp4;codecs=avc1',
        'video/mp4;codecs=h264',
        'video/webm;codecs=h264',
        'video/webm;codecs=vp9',
        'video/webm'
      ];

      let selectedMimeType = '';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          break;
        }
      }

      if (!selectedMimeType) selectedMimeType = 'video/webm';
      const extension = selectedMimeType.includes('mp4') ? 'mp4' : 'webm';
      
      const recorder = new MediaRecorder(stream, { mimeType: selectedMimeType });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: selectedMimeType });
        videoElements.forEach(v => {
          if (v.src.startsWith('blob:')) URL.revokeObjectURL(v.src);
          v.remove();
        });
        canvas.remove();
        resolve({ blob, extension });
      };

      let animationFrameId: number;
      
      const drawFrame = () => {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        let currentX = 0;
        
        videos.forEach((video, index) => {
          ctx.drawImage(video, currentX, 0, video.videoWidth, video.videoHeight);
          
          const modelId = sources[index].modelId;
          const modelName = models.find(m => m.id === modelId)?.name || 'Unknown';
          
          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.fillRect(currentX + 10, 10, 200, 30); 
          ctx.font = 'bold 16px Arial';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(modelName, currentX + 20, 32);

          currentX += video.videoWidth;
        });

        if (recorder.state === 'recording') {
            if (videos.every(v => v.ended)) {
               recorder.stop();
               return;
            }
            animationFrameId = requestAnimationFrame(drawFrame);
        }
      };

      if (onProgress) onProgress("Rendering video...");
      recorder.start();
      await Promise.all(videos.map(v => v.play().catch(e => console.warn("Auto-play blocked?", e))));
      drawFrame();

    } catch (err) {
      reject(err);
    }
  });
};
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Upload, Loader2, Image as ImageIcon, X, Trash2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

export default function GalleryPage() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('gallery_images')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) setPhotos(data || []);
    setLoading(false);
  };

  const handleDeletePhoto = async (photo: any) => {
    // We already have a CSS-based confirmation or the user clicked deliberately.
    // Removing browser confirm() to avoid blocking issues.
    
    setDeleting(true);
    try {
      // 1. Extract file path from URL more robustly
      // URL pattern: .../storage/v1/object/public/media/gallery/filename.ext
      let filePath = "";
      if (photo.url.includes('/public/media/')) {
        filePath = photo.url.split('/public/media/')[1];
      } else {
        // Fallback for older formats
        const urlParts = photo.url.split('/');
        filePath = `gallery/${urlParts[urlParts.length - 1]}`;
      }

      console.log("Deleting file at path:", filePath);

      // 2. Delete from Storage
      const { error: storageError } = await supabase.storage
        .from('media')
        .remove([filePath]);

      if (storageError) {
        console.warn("Storage delete warning (continuing to DB):", storageError.message);
      }

      // 3. Delete from DB
      const { error: dbError } = await supabase
        .from('gallery_images')
        .delete()
        .eq('id', photo.id);

      if (dbError) throw dbError;

      setSelectedPhoto(null);
      fetchPhotos();
    } catch (err: any) {
      console.error("Delete error:", err);
      alert("Failed to delete photo: " + (err.message || "Unknown error"));
    } finally {
      setDeleting(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `gallery/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('gallery_images')
        .insert([{
          user_id: user.id,
          url: publicUrl,
          alt: file.name
        }]);

      if (dbError) throw dbError;

      fetchPhotos();
    } catch (err) {
      console.error(err);
      alert("Failed to upload image.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 relative"
    >
      <div className="flex justify-between items-center bg-black/20 p-4 rounded-3xl backdrop-blur-md border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div>
          <h2 className="text-xl font-light text-white tracking-wide uppercase">Memories</h2>
          <p className="text-xs text-white/50 tracking-widest mt-1 uppercase font-medium">Capture the light</p>
        </div>
        <button 
           onClick={() => fileInputRef.current?.click()}
           disabled={uploading}
           className="p-3 liquid-button flex items-center justify-center group overflow-hidden relative active:scale-95 transition-all disabled:opacity-50"
        >
          {uploading ? (
             <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
             <Upload className="w-5 h-5 text-white/80 group-hover:text-white" />
          )}
          <input 
             type="file" 
             hidden 
             ref={fileInputRef} 
             accept="image/*" 
             onChange={handleUpload}
          />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
           <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-[2rem] border border-dashed border-white/10 flex flex-col items-center gap-4">
           <ImageIcon className="w-12 h-12 text-white/10" />
           <p className="text-white/30 text-xs tracking-[0.3em] uppercase">Your gallery is empty</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 auto-rows-[150px]">
          {photos.map((photo, i) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedPhoto(photo)}
              className={`relative rounded-[1.5rem] overflow-hidden group shadow-lg cursor-pointer ${i % 5 === 0 ? 'row-span-2 col-span-2' : i % 7 === 0 ? 'row-span-2' : ''}`}
            >
              <img 
                src={photo.url} 
                alt={photo.alt}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 filter brightness-90 group-hover:brightness-100"
              />
              <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/80 via-black/40 to-transparent backdrop-blur-[2px]">
                <p className="text-white text-[10px] tracking-widest font-light truncate uppercase">{photo.alt}</p>
                <p className="text-white/40 text-[8px] tracking-[0.2em] font-light truncate uppercase">
                   {new Date(photo.created_at).toLocaleDateString()}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-12 bg-black/95 backdrop-blur-3xl"
            onClick={() => setSelectedPhoto(null)}
          >
            <div className="absolute top-8 right-8 z-[210] flex gap-4" onClick={(e) => e.stopPropagation()}>
               <button 
                 onClick={() => handleDeletePhoto(selectedPhoto)}
                 disabled={deleting}
                 className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-full transition-all active:scale-95 disabled:opacity-50"
               >
                 {deleting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Trash2 className="w-6 h-6" />}
               </button>
               <button 
                 onClick={() => setSelectedPhoto(null)}
                 className="p-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-full transition-all"
               >
                 <X className="w-6 h-6" />
               </button>
            </div>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={selectedPhoto.url} 
                className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain border border-white/10"
                alt={selectedPhoto.alt} 
              />
              <div className="absolute bottom-[-40px] left-0 right-0 text-center">
                 <p className="text-white/60 text-xs tracking-[0.2em] uppercase">{selectedPhoto.alt}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

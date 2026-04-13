"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Send, Image as ImageIcon, Video, EyeOff, X, Trash2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

export default function ChatPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ url: string, type: string, id?: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom whenever messages change
    if (scrollRef.current) {
       scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const initChat = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;
      setUser(currentUser);

      const { data: profile } = await supabase.from('profiles').select('partner_id').eq('id', currentUser.id).single();
      if (profile && profile.partner_id) {
         setPartnerId(profile.partner_id);
      }

      const { data: existingMessages } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (existingMessages) setMessages(existingMessages);

      const channel = supabase.channel(`chat_room_${Math.random()}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_messages' },
          (payload) => setMessages((prev) => [...prev, payload.new])
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'chat_messages' },
          (payload) => setMessages((prev) => prev.filter(m => m.id !== payload.old.id))
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };

    initChat();
  }, []);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !partnerId) return;
    const msg = newMessage;
    setNewMessage("");

    await supabase.from('chat_messages').insert([{
      sender_id: user.id,
      receiver_id: partnerId,
      type: 'text',
      content: msg
    }]);
  };

  const handleDeleteMessage = async (id: string) => {
    if (!confirm("Remove this message?")) return;
    await supabase.from('chat_messages').delete().eq('id', id);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'video' | 'one_time_photo') => {
     if (!e.target.files || e.target.files.length === 0 || !user || !partnerId) return;
     const file = e.target.files[0];
     setUploading(true);

     const fileExt = file.name.split('.').pop();
     const filePath = `${user.id}/${Math.random()}.${fileExt}`;

     const { error: uploadError } = await supabase.storage.from('media').upload(filePath, file);

     if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);
        
        await supabase.from('chat_messages').insert([{
           sender_id: user.id,
           receiver_id: partnerId,
           type: type,
           content: publicUrl
        }]);
     }
     setUploading(false);
  };

  const closeLightbox = async () => {
    if (selectedMedia?.type === 'one_time_photo' && selectedMedia.id) {
       // Snapchat Style: Delete from DB silently after closing
       await supabase.from('chat_messages').delete().eq('id', selectedMedia.id);
    }
    setSelectedMedia(null);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-[80vh] relative"
    >
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 p-2 custom-scrollbar pb-10">
        {messages.map((msg, i) => {
          const isMe = msg.sender_id === user?.id;
          const isViewOnce = msg.type === "one_time_photo";

          return (
            <motion.div
              key={msg.id || i}
              initial={{ opacity: 0, scale: 0.8, originX: isMe ? 1 : 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`
                max-w-[75%] p-4 rounded-3xl backdrop-blur-md border 
                ${isMe 
                  ? 'bg-white/10 border-white/20 rounded-br-sm' 
                  : 'bg-black/30 border-black/50 rounded-bl-sm'}
                shadow-lg overflow-hidden relative group
              `}>
                {msg.type === "text" && (
                  <p className="text-sm font-light text-white/90 break-words">{msg.content}</p>
                )}
                {msg.type === "photo" && (
                  <img 
                    src={msg.content} 
                    className="max-w-full rounded-xl cursor-pointer hover:brightness-110 transition-all duration-300" 
                    alt="sent photo" 
                    onClick={() => setSelectedMedia({ url: msg.content, type: 'photo' })}
                  />
                )}
                {isViewOnce && (
                   <div 
                     onClick={() => setSelectedMedia({ url: msg.content, type: 'one_time_photo', id: msg.id })}
                     className="flex flex-col items-center justify-center p-6 space-y-3 cursor-pointer bg-black/40 rounded-2xl border border-rose-500/20 hover:bg-rose-500/10 transition-colors"
                   >
                     <EyeOff className="w-10 h-10 text-rose-400 animate-pulse" />
                     <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-rose-200">View Once Media</span>
                   </div>
                )}
                {msg.type === "video" && !msg.content.includes("youtube.com") && (
                   <div className="relative group cursor-pointer" onClick={() => setSelectedMedia({ url: msg.content, type: 'video' })}>
                      <video src={msg.content} className="max-w-full rounded-xl" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                         <div className="p-3 bg-white/20 backdrop-blur-md rounded-full">
                            <Video className="w-6 h-6 text-white" />
                         </div>
                      </div>
                   </div>
                )}
                {msg.type === "video" && msg.content.includes("youtube.com") && (
                   <iframe src={msg.content} className="w-full aspect-video rounded-xl" frameBorder={0} allowFullScreen />
                )}

                {isMe && (
                  <button 
                    onClick={() => handleDeleteMessage(msg.id)}
                    className="absolute top-2 right-2 p-1.5 bg-black/40 text-white/20 hover:text-rose-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm border border-white/5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="mt-4 liquid-glass-card p-2 rounded-full flex items-center shrink-0">
        <label className={`p-3 transition-colors cursor-pointer ${uploading ? 'text-rose-400 animate-pulse' : 'text-white/50 hover:text-white/90'}`}>
          <ImageIcon className="w-5 h-5" />
          <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => handleFileUpload(e, 'photo')} />
        </label>
        
        <button onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = (e) => handleFileUpload(e as any, 'one_time_photo');
          input.click();
        }} className="p-3 text-rose-400/50 hover:text-rose-400 transition-colors">
          <EyeOff className="w-5 h-5" />
        </button>

        <label className={`p-3 transition-colors cursor-pointer ${uploading ? 'text-rose-400 animate-pulse' : 'text-white/50 hover:text-white/90'}`}>
          <Video className="w-5 h-5" />
          <input type="file" accept="video/*" className="hidden" disabled={uploading} onChange={(e) => handleFileUpload(e, 'video')} />
        </label>
        
        <input 
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder={uploading ? "Uploading media..." : (partnerId ? "Type a message..." : "Link partner first")}
          disabled={!partnerId || uploading}
          className="flex-1 bg-transparent text-white placeholder-white/30 px-4 py-2 focus:outline-none text-sm font-light disabled:opacity-50"
        />
        
        <button 
          onClick={handleSendMessage}
          disabled={!partnerId || !newMessage.trim()}
          className="p-3 bg-white/10 hover:bg-white/20 disabled:bg-transparent disabled:text-white/30 text-white rounded-full transition-all active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Media Player Overlay (Lightbox) */}
      <AnimatePresence>
        {selectedMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-12 overflow-hidden bg-black/95 backdrop-blur-3xl"
            onClick={closeLightbox}
          >
            <motion.button
              className="absolute top-8 right-8 z-[210] p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
              onClick={closeLightbox}
            >
              <X className="w-8 h-8" />
            </motion.button>

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative max-w-full max-h-full flex items-center justify-center p-2 rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              {selectedMedia.type === 'video' ? (
                <video 
                  src={selectedMedia.url} 
                  controls 
                  autoPlay 
                  className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl border border-white/10"
                />
              ) : (
                <div className="relative group">
                   <img 
                    src={selectedMedia.url} 
                    className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl border border-white/10 object-contain"
                    alt="expanded media"
                  />
                  {selectedMedia.type === 'one_time_photo' && (
                    <div className="absolute top-4 left-4 px-4 py-2 bg-rose-500/20 backdrop-blur-xl border border-rose-500/40 rounded-full flex items-center gap-2">
                       <Trash2 className="w-4 h-4 text-rose-400" />
                       <span className="text-[10px] font-bold text-rose-200 uppercase tracking-widest">Self-Destructing on Close</span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

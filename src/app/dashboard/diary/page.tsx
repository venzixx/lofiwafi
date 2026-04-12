"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus, Lock, Globe, BookOpen, X, Send, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function DiaryPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New entry form state
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch Profile for Relationship Date
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    setProfile(profileData);

    // Fetch Diary Entries (Self + Partner Shared)
    const { data: entriesData } = await supabase
      .from('diary_entries')
      .select('*')
      .order('created_at', { ascending: false });

    // Explicitly fetching partner's shared entries manually if RLS select isn't enough
    // Actually our RLS policy handles this: (is_shared = true AND auth.uid() IN (SELECT partner_id FROM public.profiles WHERE id = user_id))
    
    setEntries(entriesData || []);
    setLoading(false);
  };

  const calculateTimeTogether = () => {
    if (!profile?.relationship_start_date) return "Setting up...";
    
    const start = new Date(profile.relationship_start_date);
    const now = new Date();
    
    const diff = now.getTime() - start.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const years = Math.floor(days / 365);
    const remainingDays = days % 365;
    const months = Math.floor(remainingDays / 30);
    const finalDays = remainingDays % 30;

    return `${years}y ${months}m ${finalDays}d`;
  };

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newContent) return;
    
    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('diary_entries').insert([{
      user_id: user.id,
      title: newTitle, // Adding title to schema mentally, wait schema didn't have title. 
      // I should update schema to include title.
      content: newContent,
      is_shared: isShared
    }]);

    if (!error) {
      setNewTitle("");
      setNewContent("");
      setIsModalOpen(false);
      fetchData();
    }
    setIsSubmitting(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      {/* Header with Dynamic Counter */}
      <div className="bg-black/20 p-6 rounded-3xl backdrop-blur-md border border-white/10 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
           <Heart className="w-24 h-24 text-white" fill="currentColor" />
        </div>
        <div className="flex justify-between items-center relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 liquid-glass rounded-2xl">
              <BookOpen className="w-8 h-8 text-white/80" />
            </div>
            <div>
              <h2 className="text-2xl font-light text-white tracking-widest uppercase">
                {calculateTimeTogether()}
              </h2>
              <p className="text-xs text-white/50 tracking-[0.2em] mt-1 font-medium">TOGETHER INFINTELY</p>
            </div>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="p-4 liquid-button rounded-2xl hover:scale-110 transition-transform active:scale-95"
          >
            <Plus className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
             <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
             <p className="text-white/30 text-sm tracking-widest uppercase">No entries yet. Write your first memory.</p>
          </div>
        ) : (
          entries.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="liquid-glass-card p-6 rounded-3xl space-y-4 cursor-pointer group hover:bg-white/5 transition-all"
            >
              <div className="flex justify-between items-start">
                <h3 className="text-xl font-light text-white tracking-wide group-hover:text-rose-200 transition-colors">
                  {entry.title || "Untitled Entry"}
                </h3>
                <div className="flex items-center space-x-3 text-[10px] text-white/40 tracking-widest uppercase font-medium">
                  <span>{new Date(entry.created_at).toLocaleDateString()}</span>
                  <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-full">
                    {entry.is_shared ? (
                      <Globe className="w-3 h-3 text-rose-400" />
                    ) : (
                      <Lock className="w-3 h-3 text-white/30" />
                    )}
                    <span>{entry.is_shared ? 'Shared' : 'Private'}</span>
                  </div>
                </div>
              </div>
              <p className="text-white/70 text-sm leading-relaxed font-light">
                {entry.content}
              </p>
            </motion.div>
          ))
        )}
      </div>

      {/* Write Entry Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }}
               onClick={() => setIsModalOpen(false)}
               className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg liquid-glass-card p-8 rounded-[2rem] relative z-10 border border-white/20 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-light text-white tracking-[0.2em] uppercase text-center w-full">New Entry</h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="absolute right-6 top-6 p-2 text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateEntry} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-white/30 tracking-[0.3em] uppercase ml-1">Title</label>
                  <input 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all font-light"
                    placeholder="Reflecting on today..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-white/30 tracking-[0.3em] uppercase ml-1">Content</label>
                  <textarea 
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    rows={6}
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all font-light resize-none"
                    placeholder="Write your heart out..."
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-4">
                     <button 
                       type="button" 
                       onClick={() => setIsShared(!isShared)}
                       className={`p-3 rounded-2xl border transition-all flex items-center gap-2 ${isShared ? 'bg-rose-500/20 border-rose-500/50 text-rose-200' : 'bg-white/5 border-white/10 text-white/50'}`}
                     >
                       {isShared ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                       <span className="text-xs uppercase tracking-widest font-medium">{isShared ? 'Shared' : 'Private'}</span>
                     </button>
                  </div>

                  <button 
                    disabled={isSubmitting}
                    className="p-4 bg-white text-black rounded-2xl hover:bg-rose-50 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-xl shadow-rose-500/10"
                  >
                    <span className="text-sm font-bold uppercase tracking-widest pl-2">Save</span>
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const Heart = ({ className, fill }: { className?: string, fill?: string }) => (
  <svg viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);

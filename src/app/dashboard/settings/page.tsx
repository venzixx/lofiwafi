"use client";

import { motion } from "framer-motion";
import { User, Copy, Search, Check, HeartHandshake, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [partnerUid, setPartnerUid] = useState("");
  const [startDate, setStartDate] = useState("");
  const [statusMsg, setStatusMsg] = useState({ text: "", isError: false });
  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (!error && data) {
        setProfile(data);
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  const copyUid = () => {
    if (!profile) return;
    navigator.clipboard.writeText(profile.unique_identifier);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLinkPartner = async () => {
    if (!partnerUid || !startDate) {
      setStatusMsg({ text: "Both fields are required", isError: true });
      return;
    }
    
    setStatusMsg({ text: "Searching...", isError: false });

    // Look up the given UID
    const { data: partnerData, error: partnerError } = await supabase
      .from('profiles')
      .select('id, display_name')
      .eq('unique_identifier', partnerUid.toUpperCase())
      .single();

    if (partnerError || !partnerData) {
      setStatusMsg({ text: "Partner UID not found", isError: true });
      return;
    }

    // Convert local date string (YYYY-MM-DD) to ISO TIMESTAMP WITH TIME ZONE
    const formattedDate = new Date(startDate).toISOString();

    // Link the partner and set relationship start date
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
         partner_id: partnerData.id,
         relationship_start_date: formattedDate
      })
      .eq('id', profile.id);

    // Give partner link to us as well for simplicity 
    // (RLS might prevent this depending on schema, so we do it if possible or manual 2-way handshake later)
    
    if (updateError) {
      setStatusMsg({ text: "Failed to link", isError: true });
      return;
    }

    // Refresh profile locally to reflect partner is set
    setProfile({ ...profile, partner_id: partnerData.id });
    setStatusMsg({ text: `Successfully connected with ${partnerData.display_name}!`, isError: false });
  };

  if (loading) {
     return <div className="p-8 text-center text-white/50">Loading profile...</div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center bg-black/20 p-4 rounded-3xl backdrop-blur-md border border-white/10 shadow-lg">
        <div className="flex items-center gap-3">
          <User className="w-6 h-6 text-white/80" />
          <div>
            <h2 className="text-xl font-light text-white tracking-wide">Identity</h2>
            <p className="text-xs text-white/50 tracking-widest mt-1">Profile & Connecting</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <motion.div className="liquid-glass-card p-6 rounded-3xl relative overflow-hidden">
           <h3 className="text-sm tracking-widest text-white/50 uppercase mb-4">Your Unique ID</h3>
           <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10">
              <span className="font-mono text-xl text-white tracking-wider">
                 {profile?.unique_identifier || "LOADING..."}
              </span>
              <button 
                 onClick={copyUid} 
                 className="p-2 liquid-button text-white group relative"
              >
                 {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
              </button>
           </div>
           <p className="text-xs text-white/40 mt-3 text-center">Share this ID with your partner so they can connect with you.</p>
        </motion.div>

        <motion.div className="liquid-glass-card p-6 rounded-3xl relative overflow-hidden">
           <h3 className="text-sm tracking-widest text-white/50 uppercase mb-4">Link Partner</h3>
           
           {profile?.partner_id ? (
              <div className="flex flex-col items-center justify-center p-6 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                 <HeartHandshake className="w-10 h-10 text-rose-400" />
                 <p className="text-white/90 font-medium tracking-wide">You are connected!</p>
              </div>
           ) : (
              <div className="space-y-4">
                 <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/40">
                     <Search className="h-4 w-4" />
                   </div>
                   <input
                     type="text"
                     value={partnerUid}
                     onChange={(e) => setPartnerUid(e.target.value)}
                     className="block w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-t-2xl border-b-0 text-white placeholder-white/30 focus:outline-none focus:bg-white/10 transition-all duration-300"
                     placeholder="Enter Partner's ID (OURS-XXXX)"
                   />
                 </div>
                 
                 <div className="relative">
                   <input
                     type="date"
                     value={startDate}
                     onChange={(e) => setStartDate(e.target.value)}
                     className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-b-2xl text-white placeholder-white/30 focus:outline-none focus:bg-white/10 transition-all duration-300 [&::-webkit-calendar-picker-indicator]:invert"
                     title="When did your relationship start?"
                   />
                 </div>

                 <button
                   onClick={handleLinkPartner}
                   className="w-full flex items-center justify-center space-x-2 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/10 transition-all duration-300 transform active:scale-95 group mt-4"
                 >
                   <span className="tracking-widest uppercase text-sm font-medium">Connect</span>
                 </button>

                 {statusMsg.text && (
                    <div className={`p-3 rounded-xl border text-sm text-center ${statusMsg.isError ? 'bg-red-500/20 text-red-200 border-red-500/30' : 'bg-green-500/20 text-green-200 border-green-500/30'}`}>
                       {statusMsg.text}
                    </div>
                 )}
              </div>
           )}
        </motion.div>

      </div>

      <motion.div className="liquid-glass-card p-6 rounded-3xl relative overflow-hidden flex justify-center">
         <button
           onClick={handleLogout}
           className="flex items-center space-x-2 px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-2xl border border-red-500/20 transition-all duration-300 transform active:scale-95 group"
         >
           <LogOut className="w-5 h-5" />
           <span className="tracking-widest uppercase text-sm font-medium">Sign Out</span>
         </button>
      </motion.div>
    </motion.div>
  );
}

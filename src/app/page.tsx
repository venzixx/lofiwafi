"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Heart, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/dashboard/youtube');
      } else {
        setChecking(false);
      }
    };
    checkUser();
  }, [router]);

  const handleGoogleLogin = async () => {
     try {
       setLoading(true);
       const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
             scopes: 'https://www.googleapis.com/auth/youtube.readonly',
             redirectTo: `${window.location.origin}/auth/callback`
          }
       });
       if (error) throw error;
     } catch (err: any) {
       setError(err.message || "Google Login failed.");
       setLoading(false);
     }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl z-0"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md liquid-glass-card p-8 relative z-10"
      >
        <div className="flex flex-col items-center text-center space-y-8">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
            className="w-16 h-16 rounded-full liquid-glass flex items-center justify-center"
          >
            <Heart className="w-8 h-8 text-white/80" fill="currentColor" />
          </motion.div>
          
          <div>
            <h1 className="text-3xl font-light tracking-widest text-white/90 mb-2 uppercase">Our Space</h1>
            <p className="text-sm text-white/50 lowercase tracking-widest">
              authenticate to enter
            </p>
          </div>

          {error && (
            <div className="w-full bg-red-500/20 text-red-200 text-sm p-3 rounded-xl border border-red-500/30">
              {error}
            </div>
          )}

          <div className="w-full pt-4">
             <button
                 onClick={handleGoogleLogin}
                 disabled={loading}
                 className="w-full flex items-center justify-center space-x-3 py-4 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-white rounded-2xl border border-white/10 transition-all duration-300 transform active:scale-95 shadow-lg"
             >
                 {loading ? (
                    <span className="tracking-widest uppercase text-sm font-medium animate-pulse">Routing...</span>
                 ) : (
                    <>
                       <svg className="w-5 h-5" viewBox="0 0 24 24">
                         <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                         <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                         <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                         <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                       </svg>
                       <span className="tracking-widest uppercase text-sm font-medium">Continue with Google</span>
                    </>
                 )}
             </button>
             <p className="text-[10px] text-white/30 text-center mt-6 uppercase tracking-widest">
               Native Session Verification Required
             </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

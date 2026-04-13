"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, Heart, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

function AuthCallbackContent() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const code = searchParams.get('code');
        
        if (code) {
          // PKCE Flow: Explicitly exchange the code for a session
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }

        // Check if we have a session now (works for both PKCE and Implicit hash)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        
        if (session) {
          router.push("/dashboard/youtube");
        } else {
          // If no code and no session, we might be in the middle of a hash processing
          const timeout = setTimeout(() => {
            setError("Authentication timed out. Please try to login again.");
          }, 5000);
          return () => clearTimeout(timeout);
        }
      } catch (err: any) {
        console.error("Auth error:", err);
        setError(err.message || "Failed to initialize session.");
      }
    };

    handleAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.push("/dashboard/youtube");
      }
    });

    return () => subscription.unsubscribe();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] relative overflow-hidden p-6 text-center">
      {/* Background Decor */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl z-0" />
      
      <div className="relative z-10 max-w-sm w-full">
        {error ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 liquid-glass-card border-rose-500/30 flex flex-col items-center gap-6"
          >
            <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
              <AlertCircle className="w-8 h-8 text-rose-500" />
            </div>
            <div>
              <h1 className="text-xl text-white font-light tracking-widest uppercase mb-2">Auth Failed</h1>
              <p className="text-rose-200/60 text-sm font-light leading-relaxed">
                {error}
              </p>
            </div>
            <button 
              onClick={() => router.push("/")}
              className="mt-4 px-8 py-3 bg-white/5 hover:bg-white/10 text-white text-xs tracking-[0.2em] rounded-xl border border-white/10 transition-all uppercase"
            >
              Back to Login
            </button>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center gap-8">
            <motion.div 
              animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-20 h-20 rounded-full liquid-glass flex items-center justify-center"
            >
              <Heart className="w-10 h-10 text-white/50" fill="currentColor" />
            </motion.div>
            
            <div className="space-y-4">
              <h1 className="text-2xl font-light tracking-[0.3em] text-white/90 uppercase">Verifying</h1>
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 text-white/20 animate-spin" />
                <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-medium leading-none">
                  Initializing Space
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#050505]"><Loader2 className="w-8 h-8 text-white/20 animate-spin" /></div>}>
      <AuthCallbackContent />
    </Suspense>
  );
}

"use client";

import { motion } from "framer-motion";
import { Book, Image as ImageIcon, MessageCircle, PlaySquare, Settings, CheckSquare, Heart, Loader2 } from "lucide-react";
import Link from "next/link"; // Navigation links
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [anniversary, setAnniversary] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }
      // Failsafe: Ensure profile exists
      const { data: profileExists } = await supabase.from('profiles').select('id').eq('id', user.id).single();
      if (!profileExists) {
        await supabase.from('profiles').insert([{ 
          id: user.id, 
          email: user.email,
          display_name: user.user_metadata.full_name || user.email?.split('@')[0],
          unique_identifier: `OURS-${user.id.substring(0, 4).toUpperCase()}`
        }]);
      }

      const { data } = await supabase.from('profiles').select('relationship_start_date').eq('id', user.id).single();
      if (data?.relationship_start_date) {
        const start = new Date(data.relationship_start_date);
        const now = new Date();
        const diff = now.getTime() - start.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const years = Math.floor(days / 365);
        const months = Math.floor((days % 365) / 30);
        const finalDays = (days % 365) % 30;
        setAnniversary(`${years}Y ${months}M ${finalDays}D`);
      }
      setLoading(false);
    };
    fetchUserData();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
      </div>
    );
  }

  const navItems = [
    { href: "/dashboard/gallery", icon: ImageIcon, label: "Gallery" },
    { href: "/dashboard/diary", icon: Book, label: "Diary" },
    { href: "/dashboard/chat", icon: MessageCircle, label: "Chat" },
    { href: "/dashboard/youtube", icon: PlaySquare, label: "YouTube" },
    { href: "/dashboard/quiz", icon: CheckSquare, label: "Quiz" },
  ];

  return (
    <div className="min-h-screen bg-transparent relative flex flex-col pb-24">
      {/* Top Glass Header */}
      <header className="sticky top-0 z-50 liquid-glass border-b-0 border-white/10 px-6 py-4 flex justify-between items-center rounded-b-3xl">
        <div className="flex flex-col">
          <h1 className="text-xl font-light tracking-widest text-white/90">Our Space</h1>
          {anniversary && (
            <div className="flex items-center gap-1.5 opacity-60">
               <Heart className="w-2.5 h-2.5 text-rose-400" fill="currentColor" />
               <span className="text-[10px] tracking-[0.2em] font-medium text-white/70 uppercase">
                 {anniversary}
               </span>
            </div>
          )}
        </div>
        <Link href="/dashboard/settings" className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
          <Settings className="w-5 h-5 text-white/70" />
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 z-10">
        {children}
      </main>

      {/* Bottom Liquid Glass Navigation */}
      <nav className="fixed bottom-4 left-4 right-4 z-50">
        <div className="max-w-md mx-auto liquid-glass rounded-full px-6 py-4 flex justify-between items-center">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className="relative p-2 flex flex-col items-center justify-center group"
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white/20 rounded-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className={`w-6 h-6 z-10 transition-colors duration-300 ${isActive ? 'text-white' : 'text-white/40 group-hover:text-white/70'}`} />
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

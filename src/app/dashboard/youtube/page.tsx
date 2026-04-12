"use client";

import { MonitorPlay, Share2, Heart, Send, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

const ShortsVideo = ({ video, sharingId, setSharingId }: { video: any, sharingId: string | null, setSharingId: (id: string | null) => void }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!iframeRef.current?.contentWindow) return;

        if (entry.isIntersecting) {
          iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo' }), '*');
        } else {
          iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo' }), '*');
        }
      });
    }, { threshold: 0.6 });

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleShareToChat = async () => {
    setSharingId(video.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setTimeout(() => setSharingId(null), 1000);

      const { data: profile } = await supabase.from('profiles').select('partner_id').eq('id', user.id).single();
      if (!profile || !profile.partner_id) {
         alert("Connect with your partner first in settings!");
         setSharingId(null);
         return;
      }

      await supabase.from('chat_messages').insert([{
         sender_id: user.id,
         receiver_id: profile.partner_id,
         type: 'video',
         content: video.url
      }]);
    } catch (err) {
      console.error(err);
    }
    setTimeout(() => setSharingId(null), 1000);
  };

  const handleExternalShare = async () => {
    const videoIdMatch = video.url.match(/embed\/([^?]+)/);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;
    const url = videoId ? `https://youtube.com/shorts/${videoId}` : video.url;

    if (navigator.share) {
      try { await navigator.share({ title: video.title, url: url }); } catch (err) {}
    } else {
      navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  };

  return (
    <div ref={containerRef} className="h-full w-full snap-start snap-always relative bg-zinc-900 flex items-center justify-center">
      <iframe 
          ref={iframeRef} width="100%" height="100%" 
          src={`${video.url}?enablejsapi=1&controls=0&autoplay=0&loop=1&playsinline=1`}
          title={video.title} frameBorder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowFullScreen className="pointer-events-auto"
      />

      <div className="absolute right-4 bottom-20 flex flex-col items-center space-y-6 z-40">
        <button className="flex flex-col items-center gap-1 group">
            <div className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 group-hover:bg-white/20 transition-all">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <span className="text-[10px] text-white/80 font-medium drop-shadow-md">Like</span>
        </button>

        <button onClick={handleShareToChat} disabled={sharingId === video.id} className="flex flex-col items-center gap-1 group disabled:opacity-50">
            <div className="p-3 bg-rose-500/80 backdrop-blur-md rounded-full border border-white/10 hover:bg-rose-500 transition-all shadow-[0_0_15px_rgba(244,63,94,0.4)]">
              <Send className={`w-6 h-6 text-white ${sharingId === video.id ? 'animate-ping' : ''} ml-1`} />
            </div>
            <span className="text-[10px] text-white/80 font-medium drop-shadow-md">{sharingId === video.id ? 'Sent!' : 'Chat'}</span>
        </button>

        <button onClick={handleExternalShare} className="flex flex-col items-center gap-1 group">
            <div className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 group-hover:bg-white/20 transition-all">
              <Share2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-[10px] text-white/80 font-medium drop-shadow-md">Out</span>
        </button>
      </div>

      <div className="absolute bottom-4 left-4 right-20 z-40 bg-gradient-to-t from-black/80 p-4 -m-4 to-transparent pointer-events-none">
          <h3 className="text-white font-medium text-sm drop-shadow-lg line-clamp-2">{video.title}</h3>
          <p className="text-white/60 text-xs mt-1 drop-shadow-md pb-4 pt-1">Scroll for more ↓</p>
      </div>
    </div>
  );
};

export default function YoutubePage() {
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [feed, setFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fallback Feed
  const fallbackFeed = [
    { id: "jfKfPfyJRdk", title: "Our Favorite Vibe", url: "https://www.youtube.com/embed/jfKfPfyJRdk" },
    { id: "dQw4w9WgXcQ", title: "Romantic Getaway", url: "https://www.youtube.com/embed/dQw4w9WgXcQ" },
    { id: "tgbNymZ7vqY", title: "Funny Moments", url: "https://www.youtube.com/embed/tgbNymZ7vqY" }
  ];

  useEffect(() => {
    const fetchPersonalizedFeed = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const providerToken = session?.provider_token;

        if (providerToken) {
           // We have a Google OAuth Token! Let's pull their likes
           const res = await fetch('https://www.googleapis.com/youtube/v3/videos?myRating=like&part=snippet&maxResults=20', {
              headers: { Authorization: `Bearer ${providerToken}` }
           });
           
           if (res.ok) {
              const data = await res.json();
              const ytVideos = data.items.map((item: any) => ({
                 id: item.id,
                 title: item.snippet.title,
                 url: `https://www.youtube.com/embed/${item.id}`
              }));
              if (ytVideos.length > 0) {
                 setFeed(ytVideos);
                 setLoading(false);
                 return;
              }
           }
        }
      } catch (err) {
        console.error("Failed to personalize feed", err);
      }
      
      // Fallback to defaults if not logged in with Google or fetch fails
      setFeed(fallbackFeed);
      setLoading(false);
    };

    fetchPersonalizedFeed();
  }, []);

  return (
    <div className="h-[80vh] bg-black rounded-3xl overflow-hidden relative shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-white/10">
      
      <div className="absolute top-0 inset-x-0 p-4 z-50 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
        <div className="flex items-center gap-2">
          <MonitorPlay className="w-5 h-5 text-white/80" />
          <h2 className="text-sm font-medium text-white tracking-wide shadow-black drop-shadow-md">
            {feed.length !== fallbackFeed.length ? "Your YouTube Feed" : "For Us"}
          </h2>
        </div>
      </div>

      {loading ? (
        <div className="h-full w-full flex items-center justify-center flex-col gap-4">
           <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
           <p className="text-white/40 text-xs tracking-widest uppercase">Syncing with YouTube...</p>
        </div>
      ) : (
        <div className="h-full w-full overflow-y-scroll snap-y snap-mandatory custom-scrollbar no-scrollbar scroll-smooth">
          {feed.map((video) => (
             <ShortsVideo key={video.id} video={video} sharingId={sharingId} setSharingId={setSharingId} />
          ))}
        </div>
      )}
    </div>
  );
}

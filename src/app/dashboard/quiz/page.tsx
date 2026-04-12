"use client";

import { motion } from "framer-motion";
import { CheckCircle2, RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import questionsData from "@/data/questions.json";

export default function QuizPage() {
  const [activeQuestion, setActiveQuestion] = useState<any>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initQuizRoom = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;
      setUser(currentUser);

      const { data: profile } = await supabase.from('profiles').select('partner_id').eq('id', currentUser.id).single();
      if (profile && profile.partner_id) {
         setPartnerId(profile.partner_id);
      }

      // Fetch the latest question
      const { data: recentQs } = await supabase
        .from('quiz_questions')
        .select('*')
        .order('id', { ascending: false })
        .limit(1);

      if (recentQs && recentQs.length > 0) {
         try {
            const parsed = JSON.parse(recentQs[0].question_text);
            setActiveQuestion({ ...recentQs[0], ...parsed });
            fetchAnswers(recentQs[0].id);
         } catch {
            // Unparsed fallback
            setActiveQuestion({ id: recentQs[0].id, question: recentQs[0].question_text, options: ["Me", "Partner", "Both", "Neither"] });
         }
      }
      setLoading(false);

      // Subscribe to New Questions
      const qsChannel = supabase.channel(`quiz_qs_${Math.random()}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'quiz_questions' }, (payload) => {
             try {
                const parsed = JSON.parse(payload.new.question_text);
                setActiveQuestion({ ...payload.new, ...parsed });
                setAnswers([]);
                fetchAnswers(payload.new.id);
             } catch {}
        }).subscribe();

      // Subscribe to Answers
      const ansChannel = supabase.channel(`quiz_ans_${Math.random()}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'quiz_answers' }, (payload) => {
             setAnswers(prev => [...prev, payload.new]);
        }).subscribe();

      return () => { supabase.removeChannel(qsChannel); supabase.removeChannel(ansChannel); };
    };

    initQuizRoom();
  }, []);

  const fetchAnswers = async (qId: string) => {
      const { data } = await supabase.from('quiz_answers').select('*').eq('question_id', qId);
      if (data) setAnswers(data);
  };

  const generateQuestion = async () => {
     if (!user || !partnerId) return;
     // Pick random from JSON
     const q = questionsData[Math.floor(Math.random() * questionsData.length)];
     const payload = JSON.stringify(q);

     await supabase.from('quiz_questions').insert([{ question_text: payload }]);
  };

  const submitAnswer = async (opt: string) => {
     if (!user || !partnerId || !activeQuestion) return;
     
     // Check if I already answered
     if (answers.some(a => a.user_id === user.id && a.question_id === activeQuestion.id)) return;

     await supabase.from('quiz_answers').insert([{
        question_id: activeQuestion.id,
        user_id: user.id,
        answer: opt
     }]);
  };

  if (loading) {
     return <div className="p-8 flex justify-center text-white/50"><Loader2 className="animate-spin" /></div>;
  }

  if (!partnerId) {
     return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
           <AlertCircle className="w-12 h-12 text-rose-400" />
           <p className="text-white/60">Connect a partner in settings to use the Quiz Room.</p>
        </div>
     )
  }

  const myAnswer = answers.find(a => a.user_id === user?.id)?.answer;
  const partnerAnswer = answers.find(a => a.user_id === partnerId)?.answer;
  const isMatch = myAnswer && partnerAnswer && myAnswer === partnerAnswer;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center bg-black/20 p-4 rounded-3xl backdrop-blur-md border border-white/10 shadow-lg">
        <div>
          <h2 className="text-xl font-light text-white tracking-wide">Compatibility Quiz</h2>
          <p className="text-xs text-white/50 tracking-widest mt-1">Realtime Match Room</p>
        </div>
        <button onClick={generateQuestion} className="p-3 liquid-button flex items-center gap-2 group">
           <RefreshCw className="w-5 h-5 text-white/80 group-hover:rotate-180 transition-all duration-700" />
           <span className="text-xs font-medium text-white/80">Generate</span>
        </button>
      </div>

      <div className="space-y-4">
        {activeQuestion ? (
          <motion.div
            key={activeQuestion.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="liquid-glass-card p-6 rounded-3xl relative overflow-hidden text-center"
          >
            <h3 className="text-xl font-light text-white mb-8 px-4 leading-relaxed">{activeQuestion.question}</h3>
            
            <div className="grid grid-cols-2 gap-3 relative z-10">
              {activeQuestion.options?.map((opt: string) => {
                 const iChose = myAnswer === opt;
                 const partnerChose = partnerAnswer === opt;

                 return (
                    <button 
                       key={opt}
                       onClick={() => submitAnswer(opt)}
                       disabled={!!myAnswer}
                       className={`
                         relative p-4 rounded-2xl border transition-all duration-300
                         ${iChose ? 'bg-white/20 border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'bg-white/5 border-white/10'}
                         ${!myAnswer ? 'hover:bg-white/10 active:scale-95' : 'cursor-default'}
                       `}
                    >
                       <span className="text-sm tracking-wide text-white font-medium">{opt}</span>
                       <div className="absolute top-2 right-2 flex gap-1">
                          {iChose && <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#fff]" title="Me" />}
                          {partnerChose && <span className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_8px_#fc8181]" title="Partner" />}
                       </div>
                    </button>
                 )
              })}
            </div>

            {myAnswer && !partnerAnswer && (
                 <div className="mt-6 text-center animate-pulse">
                    <p className="text-xs text-white/40 tracking-widest uppercase">Waiting for partner...</p>
                 </div>
            )}

            {isMatch && (
               <motion.div 
                 initial={{ scale: 0, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 className="mt-6 flex flex-col items-center gap-2"
               >
                 <CheckCircle2 className="w-12 h-12 text-green-400 drop-shadow-[0_0_12px_rgba(74,222,128,0.5)]" />
                 <p className="text-sm font-medium text-green-400 tracking-widest uppercase">It's a Match!</p>
               </motion.div>
            )}

          </motion.div>
        ) : (
          <div className="liquid-glass-card p-12 rounded-3xl text-center">
             <p className="text-white/40 italic">Click Generate to pull a question from the vault.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

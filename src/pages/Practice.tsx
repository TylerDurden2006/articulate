import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, CheckCircle2, RotateCcw, Loader2 } from "lucide-react";
import { getDueWords, recordReview, getWordDetail } from "@/lib/api";
import { useStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { WordDetail } from "@/lib/api";

export default function Practice() {
  const navigate = useNavigate();
  const { dueWords, setDueWords, currentWordIndex, advanceWord, resetSession } = useStore();
  const [wordDetail, setWordDetail] = useState<WordDetail | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [rating, setRating] = useState(0);
  const [startTime, setStartTime] = useState(0);

  useEffect(() => {
    loadDueWords();
    return () => resetSession();
  }, []);

  useEffect(() => {
    if (dueWords.length > 0 && currentWordIndex < dueWords.length) {
      loadWordDetail(dueWords[currentWordIndex].id);
      setRevealed(false);
      setRating(0);
      setStartTime(Date.now());
    }
  }, [currentWordIndex, dueWords]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (completed || loading) return;
      if (!revealed) {
        if (e.code === "Space") {
          e.preventDefault();
          handleReveal();
        }
      } else {
        if (e.key >= "1" && e.key <= "4") {
          handleRating(parseInt(e.key));
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [revealed, rating, completed, loading, currentWordIndex]);

  async function loadDueWords() {
    try {
      const words = await getDueWords(10);
      setDueWords(words);
    } catch (e) {
      console.error("Failed to load due words", e);
    } finally {
      setLoading(false);
    }
  }

  async function loadWordDetail(wordId: number) {
    try {
      const detail = await getWordDetail(wordId);
      setWordDetail(detail);
    } catch (e) {
      console.error("Failed to load word detail", e);
    }
  }

  const handleReveal = useCallback(() => {
    setRevealed(true);
  }, []);

  const handleRating = useCallback(async (r: number) => {
    if (rating > 0) return;
    setRating(r);
    const elapsed = Date.now() - startTime;
    try {
      await recordReview(dueWords[currentWordIndex].id, r, elapsed);
    } catch (e) {
      console.error("Failed to record review", e);
    }
    setTimeout(() => {
      if (currentWordIndex + 1 >= dueWords.length) {
        setCompleted(true);
      } else {
        advanceWord();
      }
    }, 600);
  }, [rating, currentWordIndex, dueWords, startTime, advanceWord]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (completed) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] p-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full text-center">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Session Complete!</h2>
          <p className="text-sm text-muted-foreground mt-2">You reviewed {dueWords.length} words. Come back tomorrow for more.</p>
          <div className="flex gap-3 justify-center mt-6">
            <Button variant="outline" onClick={() => navigate("/")}>Dashboard</Button>
            <Button onClick={() => { resetSession(); setCompleted(false); setLoading(true); loadDueWords(); }}>
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Review Again
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (dueWords.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] p-6">
        <div className="text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold">No words due!</h2>
          <p className="text-sm text-muted-foreground mt-1">You're all caught up. Check back later.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const word = dueWords[currentWordIndex];
  const progress = ((currentWordIndex) / dueWords.length) * 100;

  return (
    <div className="max-w-2xl mx-auto w-full p-4 md:p-10 flex flex-col">
      <Button variant="ghost" onClick={() => navigate("/")} className="w-fit mb-6">
        <ArrowLeft className="h-4 w-4 mr-1.5" />
        <span className="text-sm">Exit</span>
      </Button>

      <div className="flex items-center gap-3 mb-8">
        <Progress value={progress} className="flex-1 h-1.5" />
        <span className="text-xs font-medium text-muted-foreground tabular-nums">
          {currentWordIndex + 1} / {dueWords.length}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={word.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="flex-1 flex flex-col"
        >
          <div className="text-center mb-8">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              #{word.rank}
            </span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mt-2">{word.word}</h2>
          </div>

          {!revealed ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex-1 flex items-center justify-center">
              <Button onClick={handleReveal} size="lg" className="px-8 py-6 text-base shadow-lg shadow-teal-500/20">
                Reveal Definition
              </Button>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {wordDetail && wordDetail.senses.length > 0 ? (
                <div className="space-y-4">
                  {wordDetail.senses.map((sense) => (
                    <Card key={sense.id}>
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="text-[11px]">{sense.part_of_speech || "definition"}</Badge>
                          <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{sense.register}</span>
                        </div>
                        <p className="text-sm leading-relaxed">{sense.definition}</p>
                        {sense.example_sentence && (
                          <p className="text-sm text-muted-foreground italic mt-2 leading-relaxed">&ldquo;{sense.example_sentence}&rdquo;</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-amber-200 dark:border-amber-800">
                  <CardContent className="p-5 text-center">
                    <p className="text-sm text-amber-700 dark:text-amber-400">No definition loaded yet. Add context in the Library.</p>
                  </CardContent>
                </Card>
              )}

              <div className="pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 text-center">
                  How well did you know this?
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Again", key: 1, cls: "bg-red-500 hover:bg-red-600", text: "Didn't know" },
                    { label: "Hard", key: 2, cls: "bg-orange-500 hover:bg-orange-600", text: "Barely" },
                    { label: "Good", key: 3, cls: "bg-teal-500 hover:bg-teal-600", text: "Knew it" },
                    { label: "Easy", key: 4, cls: "bg-emerald-500 hover:bg-emerald-600", text: "Instant" },
                  ].map((btn) => (
                    <Button
                      key={btn.key}
                      onClick={() => handleRating(btn.key)}
                      disabled={rating > 0}
                      className={`${btn.cls} text-white h-auto py-3 px-2 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      <div className="flex flex-col">
                        <span>{btn.label}</span>
                        <span className="text-[10px] font-normal opacity-80 mt-0.5">{btn.text}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

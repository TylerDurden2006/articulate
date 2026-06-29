import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { getWeakWords } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { WeakWord } from "@/lib/api";

export default function WeakWords() {
  const [words, setWords] = useState<WeakWord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWeakWords();
  }, []);

  async function loadWeakWords() {
    try {
      const w = await getWeakWords();
      setWords(w);
    } catch (e) {
      console.error("Failed to load weak words", e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full p-4 md:p-10 flex flex-col">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Weak Words</h1>
        <p className="text-sm text-muted-foreground mt-1">Words that need extra attention</p>
      </motion.div>

      {words.length === 0 ? (
        <div className="text-center py-16">
          <div className="bg-emerald-50 dark:bg-emerald-950/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="text-lg font-semibold">No weak words</h2>
          <p className="text-sm text-muted-foreground mt-1">All your words are in good shape. Keep reviewing!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {words.map((w) => (
            <motion.div key={w.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">{w.word}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-muted-foreground">Tier {w.tier}</span>
                      <span className="text-[11px] text-muted-foreground">&middot;</span>
                      <span className="text-[11px] text-muted-foreground">{w.lapses} lapses</span>
                      <span className="text-[11px] text-muted-foreground">&middot;</span>
                      <Badge variant={w.accuracy < 50 ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0">
                        {w.accuracy}%
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

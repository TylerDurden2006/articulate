import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Search, X, BookOpen, Loader2, Calendar } from "lucide-react";
import { searchWords, getWordDetail } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Word, WordDetail } from "@/lib/api";

const WORDS_PER_PAGE = 100;

export default function Library() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Word[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Dialog State
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [wordDetail, setWordDetail] = useState<WordDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Load initial words
  const loadWords = useCallback(async (q: string, currentOffset: number, append = false) => {
    if (currentOffset === 0) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const words = await searchWords(q, WORDS_PER_PAGE, currentOffset);
      if (append) {
        setResults((prev) => [...prev, ...words]);
      } else {
        setResults(words);
      }
      setHasMore(words.length === WORDS_PER_PAGE);
    } catch (e) {
      console.error("Failed to load words", e);
      if (!append) setResults([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initialize page on load
  useEffect(() => {
    loadWords("", 0);
  }, [loadWords]);

  // Handle Search Input Change
  const handleSearch = (val: string) => {
    setQuery(val);
    setOffset(0);
    loadWords(val, 0);
  };

  // Load More Words
  const handleLoadMore = () => {
    const nextOffset = offset + WORDS_PER_PAGE;
    setOffset(nextOffset);
    loadWords(query, nextOffset, true);
  };

  // Click on a word card
  const handleWordClick = async (word: Word) => {
    setSelectedWord(word);
    setDialogOpen(true);
    setLoadingDetail(true);
    setWordDetail(null);
    try {
      const detail = await getWordDetail(word.id);
      setWordDetail(detail);
    } catch (e) {
      console.error("Failed to fetch word details", e);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full p-4 md:p-10 flex flex-col">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">5,000 Words Library</h1>
        <p className="text-sm text-muted-foreground mt-1">Browse all 5,000 words, search, and view detailed learning cards</p>
      </motion.div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search any word..."
          className="pl-10 pr-10"
        />
        {query && (
          <button onClick={() => handleSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {results.map((word, idx) => (
              <motion.div
                key={word.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.005, 0.2) }}
                onClick={() => handleWordClick(word)}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-card border border-border hover:border-teal-500/50 hover:bg-teal-500/5 transition-all cursor-pointer group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-semibold text-muted-foreground/70 tabular-nums w-8">
                    #{word.rank}
                  </span>
                  <span className="text-sm font-medium group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                    {word.word}
                  </span>
                </div>
                <Badge variant={word.tier === 0 ? "outline" : word.tier >= 4 ? "default" : "secondary"} className="text-[10px] scale-90">
                  {word.tier === 0 ? "New" : word.tier >= 4 ? "Mastered" : `Tier ${word.tier}`}
                </Badge>
              </motion.div>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-6 pb-12">
              <Button onClick={handleLoadMore} disabled={loadingMore} variant="outline" className="px-6 py-2">
                {loadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading more...
                  </>
                ) : (
                  "Load More Words"
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {!loading && results.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">No words found for &ldquo;{query}&rdquo;</p>
        </div>
      )}

      {/* Word Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md w-[95vw] rounded-xl">
          <DialogHeader className="text-left">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] tracking-wider uppercase font-semibold">
                Rank #{selectedWord?.rank}
              </Badge>
              <Badge variant={selectedWord?.tier === 0 ? "outline" : (selectedWord?.tier && selectedWord.tier >= 4) ? "default" : "secondary"} className="text-[10px]">
                {selectedWord?.tier === 0 ? "New" : (selectedWord?.tier && selectedWord.tier >= 4) ? "Mastered" : `Tier ${selectedWord?.tier}`}
              </Badge>
            </div>
            <DialogTitle className="text-3xl font-bold tracking-tight capitalize">
              {selectedWord?.word}
            </DialogTitle>
          </DialogHeader>

          {loadingDetail ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
            </div>
          ) : (
            <div className="space-y-5">
              {wordDetail && wordDetail.senses.length > 0 ? (
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Definitions</span>
                  {wordDetail.senses.map((sense) => (
                    <Card key={sense.id} className="border-border/60 bg-muted/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge variant="secondary" className="text-[10px]">{sense.part_of_speech || "definition"}</Badge>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{sense.register}</span>
                        </div>
                        <p className="text-sm text-foreground/90 leading-relaxed font-medium">{sense.definition}</p>
                        {sense.example_sentence && (
                          <p className="text-xs text-muted-foreground italic mt-2 leading-relaxed">&ldquo;{sense.example_sentence}&rdquo;</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-amber-200/50 bg-amber-500/5 dark:border-amber-800/40">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">No definition loaded yet. Run a practice session or edit context to add meaning.</p>
                  </CardContent>
                </Card>
              )}

              {/* SM2 / Learning Statistics */}
              {wordDetail && (
                <div className="pt-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Learning Progress</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-lg border border-border/50 bg-card/50 flex flex-col justify-between">
                      <span className="text-muted-foreground">Ease Factor</span>
                      <span className="text-base font-bold text-foreground mt-0.5">{wordDetail.ease.toFixed(2)}</span>
                    </div>
                    <div className="p-3 rounded-lg border border-border/50 bg-card/50 flex flex-col justify-between">
                      <span className="text-muted-foreground">Repetition Interval</span>
                      <span className="text-base font-bold text-foreground mt-0.5">{wordDetail.interval} days</span>
                    </div>
                    <div className="p-3 rounded-lg border border-border/50 bg-card/50 flex flex-col justify-between">
                      <span className="text-muted-foreground">Total Reviews</span>
                      <span className="text-base font-bold text-foreground mt-0.5">{wordDetail.reviews}</span>
                    </div>
                    <div className="p-3 rounded-lg border border-border/50 bg-card/50 flex flex-col justify-between">
                      <span className="text-muted-foreground">Lapses / Mistakes</span>
                      <span className="text-base font-bold text-foreground mt-0.5">{wordDetail.lapses}</span>
                    </div>
                  </div>

                  {selectedWord?.due_date && (
                    <div className="mt-3 flex items-center gap-1.5 justify-center text-xs text-muted-foreground bg-muted/40 py-2 rounded-lg">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Next review scheduled for: {selectedWord.due_date}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

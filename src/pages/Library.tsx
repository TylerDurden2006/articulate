import { useState, useCallback } from "react";
import { motion } from "motion/react";
import { Search, X, BookOpen, Loader2 } from "lucide-react";
import { searchWords } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Word } from "@/lib/api";

export default function Library() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Word[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (q.trim().length < 1) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const words = await searchWords(q);
      setResults(words);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="max-w-3xl mx-auto w-full p-4 md:p-10 flex flex-col">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">5,000 Words Library</h1>
        <p className="text-sm text-muted-foreground mt-1">Browse, search, and add context to any word</p>
      </motion.div>

      <div className="relative mb-8">
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
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && query && results.length > 0 && (
        <div className="space-y-1">
          {results.map((word) => (
            <motion.div
              key={word.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-accent transition-colors cursor-pointer border border-transparent hover:border-border"
            >
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold text-muted-foreground tabular-nums w-10">#{word.rank}</span>
                <span className="text-sm font-medium">{word.word}</span>
                <Badge variant={word.tier === 0 ? "outline" : word.tier >= 4 ? "default" : "secondary"}>
                  {word.tier === 0 ? "New" : word.tier >= 4 ? "Mastered" : `Tier ${word.tier}`}
                </Badge>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!loading && query && results.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">No words found for &ldquo;{query}&rdquo;</p>
        </div>
      )}

      {!query && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-3" />
          <p className="text-sm">Search for any word in the 5,000-word list</p>
        </div>
      )}
    </div>
  );
}

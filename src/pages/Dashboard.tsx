import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  BookOpen,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Zap,
  ArrowRight,
  Loader2,
  Flame,
  Save,
} from "lucide-react";
import { getStats, seedWordList, seedWordSenses, backupDatabase, getBackups } from "@/lib/api";
import { useStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { DashboardStats, BackupInfo } from "@/lib/api";

export default function Dashboard() {
  const navigate = useNavigate();
  const { seeded, setSeeded, setStats } = useStore();
  const [stats, setLocalStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [backingUp, setBackingUp] = useState(false);

  useEffect(() => {
    loadStats();
    loadBackups();
  }, []);

  async function loadStats() {
    try {
      const s = await getStats();
      setLocalStats(s);
      setStats(s);
      if (s.total_words === 0 && !seeded) {
        setSeeding(true);
        const count = await seedWordList();
        await seedWordSenses();
        setSeeded(true, count);
        const s2 = await getStats();
        setLocalStats(s2);
        setStats(s2);
        setSeeding(false);
      }
    } catch (e) {
      console.error("Failed to load stats", e);
    } finally {
      setLoading(false);
    }
  }

  async function loadBackups() {
    try {
      const list = await getBackups();
      setBackups(list);
    } catch (e) {
      console.error("Failed to load backups", e);
    }
  }

  const handleBackup = useCallback(async () => {
    setBackingUp(true);
    try {
      const info = await backupDatabase();
      setBackups((prev) => [info, ...prev]);
    } catch (e) {
      console.error("Backup failed", e);
    } finally {
      setBackingUp(false);
    }
  }, []);

  if (loading || seeding) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">{seeding ? "Seeding word list..." : "Loading..."}</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Due Today", value: stats?.due_today ?? 0, icon: BookOpen, color: "text-teal-600" },
    { label: "Mastered", value: stats?.mastered ?? 0, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Learning", value: stats?.learning ?? 0, icon: TrendingUp, color: "text-amber-600" },
    { label: "Weak Words", value: stats?.weak ?? 0, icon: AlertTriangle, color: "text-red-600" },
  ];

  const lastBackup = backups.length > 0 ? backups[0] : null;

  return (
    <div className="max-w-3xl mx-auto w-full p-4 md:p-10 flex flex-col">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Your Vocabulary</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {stats?.total_words ?? 0} words loaded &middot; building toward 5,000
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card>
              <CardContent className="p-4">
                <card.icon className={`h-5 w-5 ${card.color} mb-2`} />
                <div className="text-2xl font-bold">{card.value}</div>
                <div className="text-[11px] font-medium text-muted-foreground mt-0.5 uppercase tracking-wider">
                  {card.label}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {(stats?.streak ?? 0) > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <Card className="bg-gradient-to-r from-orange-50 to-rose-50 dark:from-orange-950/30 dark:to-rose-950/30 border-orange-200 dark:border-orange-800">
            <CardContent className="p-4 flex items-center gap-3">
              <Flame className="h-6 w-6 text-orange-500 shrink-0" />
              <div>
                <span className="text-xl font-bold text-orange-600 dark:text-orange-400">
                  {stats?.streak}
                </span>
                <span className="text-sm text-orange-600 dark:text-orange-400 ml-1.5 font-medium">
                  day streak
                </span>
              </div>
              <span className="text-xs text-muted-foreground ml-auto">Keep it going!</span>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {(stats?.due_today ?? 0) > 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
          <Button
            onClick={() => navigate("/practice")}
            className="w-full h-auto py-6 px-6 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-lg shadow-teal-500/20 hover:shadow-xl transition-all group"
          >
            <div className="flex items-center justify-between w-full">
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  <span className="text-lg font-semibold">{stats?.due_today} words due today</span>
                </div>
                <p className="text-sm text-white/80 mt-1">Start your daily practice</p>
              </div>
              <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </div>
          </Button>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <Card className="p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold">All caught up!</h2>
            <p className="text-sm text-muted-foreground mt-1">No words due today. Come back tomorrow or explore the library.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/library")}>
              Browse 5,000 Words
            </Button>
          </Card>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8 pt-6">
        <Separator className="mb-6" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Save className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Backups</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleBackup} disabled={backingUp}>
            {backingUp ? "Backing up..." : "Backup Now"}
          </Button>
        </div>
        {lastBackup ? (
          <p className="text-xs text-muted-foreground mt-1">Last backup: {lastBackup.created_at} ({backups.length} total)</p>
        ) : (
          <p className="text-xs text-muted-foreground mt-1">No backups yet. Auto-backup runs on every launch.</p>
        )}
      </motion.div>
    </div>
  );
}

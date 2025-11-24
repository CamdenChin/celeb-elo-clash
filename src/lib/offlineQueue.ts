import { supabase } from "@/integrations/supabase/client";

interface QueuedVote {
  winnerId: string | null;
  loserId: string | null;
  userId: string | null;
  clickTimeMs: number;
  timestamp: number;
  isSkip?: boolean;
  celebrity1Id?: string;
  celebrity2Id?: string;
}

const QUEUE_KEY = 'offline_vote_queue';

export const offlineQueue = {
  // Add vote to offline queue
  enqueue: (vote: Omit<QueuedVote, 'timestamp'>) => {
    const queue = offlineQueue.getQueue();
    queue.push({ ...vote, timestamp: Date.now() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  // Get all queued votes
  getQueue: (): QueuedVote[] => {
    try {
      const stored = localStorage.getItem(QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  // Clear the queue
  clear: () => {
    localStorage.removeItem(QUEUE_KEY);
  },

  // Sync all queued votes to the server
  sync: async () => {
    const queue = offlineQueue.getQueue();
    if (queue.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;
    const failedVotes: QueuedVote[] = [];

    for (const vote of queue) {
      try {
        const { error } = await supabase.functions.invoke('submit-vote', {
          body: {
            winnerId: vote.winnerId,
            loserId: vote.loserId,
            userId: vote.userId,
            clickTimeMs: vote.clickTimeMs,
            isSkip: vote.isSkip || false,
            celebrity1Id: vote.celebrity1Id,
            celebrity2Id: vote.celebrity2Id,
          }
        });

        if (error) {
          failed++;
          failedVotes.push(vote);
        } else {
          synced++;
        }
      } catch {
        failed++;
        failedVotes.push(vote);
      }
    }

    // Keep only failed votes in queue
    if (failedVotes.length > 0) {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(failedVotes));
    } else {
      offlineQueue.clear();
    }

    return { synced, failed };
  },

  // Get queue size
  getSize: (): number => {
    return offlineQueue.getQueue().length;
  },

  // Check if online
  isOnline: (): boolean => {
    return navigator.onLine;
  }
};

// Auto-sync when coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('Back online, syncing queued votes...');
    offlineQueue.sync().then(result => {
      console.log(`Synced ${result.synced} votes, ${result.failed} failed`);
    });
  });
}

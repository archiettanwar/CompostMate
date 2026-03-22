import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

export const useLeaderboard = (limitCount = 50) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, "users"),
      orderBy("xp", "desc"),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const users = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setLeaderboard(users);
        setLoading(false);
      } catch (err) {
        console.error("Leaderboard Error:", err);
        setError(err);
        setLoading(false);
      }
    }, (err) => {
      console.error("Leaderboard Subscription Error:", err);
      setError(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [limitCount]);

  return { leaderboard, loading, error };
};

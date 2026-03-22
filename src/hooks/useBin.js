import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export const useBin = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setLogs([]);
        setLoading(false);
        return;
      }

      const q = query(
        collection(db, "users", user.uid, "logs"),
        orderBy("timestamp", "desc")
      );

      const unsubscribeLogs = onSnapshot(q, (snapshot) => {
        const logsData = snapshot.docs.map(doc => {
          const data = doc.data();
          const timestamp = data.timestamp?.toDate() || new Date();
          
          // Maturity Logic: 30 days for full maturity
          const daysPassed = (new Date() - timestamp) / (1000 * 60 * 60 * 24);
          const maturityProgress = Math.min(100, Math.max(0, (daysPassed / 30) * 100));

          return {
            id: doc.id,
            ...data,
            timestamp,
            maturityProgress: Math.round(maturityProgress)
          };
        });
        setLogs(logsData);
        setLoading(false);
      });

      return () => unsubscribeLogs();
    });

    return () => unsubscribeAuth();
  }, []);

  return { logs, loading };
};

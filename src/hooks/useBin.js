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
        collection(db, "users", user.uid, "bins"),
        orderBy("timestamp", "desc")
      );

      const unsubscribeLogs = onSnapshot(q, (snapshot) => {
        const binsData = snapshot.docs.map(doc => {
          const data = doc.data();
          const timestamp = data.timestamp?.toDate() || new Date();
          
          let maturityProgress = 0;
          let isMatured = false;

          // Maturity Logic: Only applies if a bin has started curing
          if (data.status === 'curing' || data.status === 'matured') {
            const curingStartedAt = data.curingStartedAt?.toDate() || timestamp;
            const daysPassed = (new Date() - curingStartedAt) / (1000 * 60 * 60 * 24);
            maturityProgress = Math.min(100, Math.max(0, (daysPassed / 30) * 100));
            isMatured = maturityProgress >= 100;

            // Trigger Notification Once
            if (isMatured && !data.notifiedMatured) {
              const triggerNotification = async () => {
                try {
                  const { writeBatch, doc, collection, serverTimestamp } = await import('firebase/firestore');
                  const batch = writeBatch(db);
                  
                  // Update Bin
                  const binRef = doc(db, "users", user.uid, "bins", doc.id);
                  batch.update(binRef, { notifiedMatured: true, status: 'matured' });

                  // Create Notification
                  const notifRef = doc(collection(db, "users", user.uid, "notifications"));
                  batch.set(notifRef, {
                    type: 'maturity',
                    binId: doc.id,
                    title: 'Bin Fully Matured! ✨',
                    message: `Your compost bin "${data.name}" has reached 100% maturity and is ready for the garden!`,
                    timestamp: serverTimestamp(),
                    read: false
                  });

                  await batch.commit();
                } catch (e) {
                  console.error("Failed to trigger maturity notification: ", e);
                }
              };
              triggerNotification();
            }
          }

          return {
            id: doc.id,
            ...data,
            timestamp,
            maturityProgress: Math.round(maturityProgress),
            isMatured
          };
        });

        setLogs(binsData); // Kept state name logs purely for compatibility, but it contains bins.
        setLoading(false);
      });

      return () => unsubscribeLogs();
    });

    return () => unsubscribeAuth();
  }, []);

  return { logs, loading };
};

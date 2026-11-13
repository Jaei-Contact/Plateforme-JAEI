import { useState, useEffect } from 'react';
import api from './api';

/**
 * Articles dont je suis co-auteur sans en être le soumetteur (repéré par mon e-mail dans la liste des auteurs).
 * Consultation seule (retour client du 13/11/2026) : GET /submissions?scope=coauthored.
 */
export const useCoAuthored = () => {
  const [items, setItems]   = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get('/submissions', { params: { scope: 'coauthored' } })
      .then(res => { if (!cancelled) setItems(res.data.submissions || []); })
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  return { items, loaded };
};

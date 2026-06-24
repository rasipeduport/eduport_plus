import { useState } from 'react';
import api from '../lib/api';

/**
 * Star-rating state + submit handler shared by the session card and the last
 * class card. Persists the rating via PUT /api/sessions/ and shows a transient
 * success state for 2s.
 */
export function useSessionRating(session) {
  const [isRated, setIsRated] = useState(!!session.rating);
  const [rating, setRating] = useState(session.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleRate = async (value) => {
    if (isRated || isSubmitting) return;

    setRating(value);
    setIsSubmitting(true);

    try {
      await api.put('/api/sessions/', {
        id: session.id,
        rating: value
      });
      setIsRated(true);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to rate session:', err);
      setRating(0);
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isRated, rating, hoverRating, setHoverRating, isSubmitting, showSuccess, handleRate };
}

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, User, Play, FileText, BookOpen, Star, CheckCircle2 } from 'lucide-react';
import { Card } from '../ui/card';
import api from '../../lib/api';
import { cn } from '../../lib/utils';

function formatSessionDate(startIso, endIso) {
  if (!startIso || !endIso) return { dateLabel: '', timeLabel: '' };
  const start = new Date(startIso);
  const end = new Date(endIso);
  const now = new Date();

  const isToday = start.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = start.toDateString() === yesterday.toDateString();

  let dateLabel;
  if (isToday) dateLabel = 'Today';
  else if (isYesterday) dateLabel = 'Yesterday';
  else
    dateLabel = new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }).format(start);

  const timeFmt = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  const timeLabel = `${timeFmt.format(start)} - ${timeFmt.format(end)}`;

  return { dateLabel, timeLabel };
}

export function LastClassCard({ session }) {
  const { dateLabel, timeLabel } = formatSessionDate(
    session.start_time,
    session.end_time
  );

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
      console.error('Failed to save rating:', err);
      setRating(0); // reset on error
    } finally {
      setIsSubmitting(false);
    }
  };

  const resources = [
    {
      href: session.recording_link,
      icon: Play,
      label: 'Recording',
      color: 'text-primary',
      bg: 'bg-primary-subtle',
      hover: 'hover:border-primary/40 hover:bg-primary/5'
    },
    {
      href: session.notes_link,
      icon: FileText,
      label: 'Notes',
      color: 'text-info',
      bg: 'bg-info-subtle',
      hover: 'hover:border-info/40 hover:bg-info/5'
    },
    {
      href: session.homework_link,
      icon: BookOpen,
      label: 'Homework',
      color: 'text-warning',
      bg: 'bg-warning-subtle',
      hover: 'hover:border-warning/40 hover:bg-warning/5'
    }
  ].filter((r) => r.href);

  return (
    <Card
      className="relative"
      style={{
        backgroundImage:
          'radial-gradient(circle at top right, rgb(255 214 91 / 0.16), transparent 55%)'
      }}
    >
      <div>
        {/* Header: Date + Title and Icon */}
        <div className="mb-3 flex items-start justify-between">
          <div>
            <span className="border-primary/15 bg-primary-subtle text-primary-hover inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
              {dateLabel}
            </span>
            <p className="text-text-primary mt-1.5 line-clamp-2 text-2xl font-bold tracking-tight">
              {session.title}
            </p>
          </div>
          <div className="bg-primary-subtle ml-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
            <Calendar className="text-primary h-5 w-5" />
          </div>
        </div>

        {/* Time + Tutor */}
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
          <div className="text-text-primary inline-flex items-center gap-1.5 text-sm font-semibold">
            <Clock className="text-text-muted h-4 w-4" />
            {timeLabel}
          </div>
          {session.tutor_profile?.full_name && (
            <div className="text-text-muted inline-flex items-center gap-1.5 text-xs">
              <User className="h-3.5 w-3.5" />
              {session.tutor_profile.full_name}
            </div>
          )}
        </div>

        <div className="border-border-light mb-4 border-t" />

        {/* Rating Section - ABOVE the buttons */}
        <AnimatePresence>
          {(!isRated || showSuccess) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="border-primary/10 bg-primary-subtle/70 flex items-center justify-between rounded-xl border px-4 py-3">
                <div className="text-primary-hover text-sm font-semibold">
                  {showSuccess
                    ? 'Thanks for rating!'
                    : 'Rate your session'}
                </div>
                <div className="flex items-center gap-1">
                  {showSuccess ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      <CheckCircle2 className="text-primary h-6 w-6" />
                    </motion.div>
                  ) : (
                    [1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleRate(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        disabled={isSubmitting}
                        className={cn(
                          'transition-transform hover:scale-110 focus:outline-none cursor-pointer',
                          isSubmitting && 'cursor-not-allowed opacity-50'
                        )}
                      >
                        <Star
                          className={cn(
                            'h-6 w-6',
                            star <= (hoverRating || rating)
                              ? 'text-warning fill-warning'
                              : 'text-text-muted/40 hover:text-warning/70'
                          )}
                        />
                      </button>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rating state when already rated */}
        {isRated && !showSuccess && (
          <div className="border-border-light bg-surface-muted/50 flex items-center justify-between rounded-xl border px-4 py-3 mb-4">
            <div className="text-text-muted text-sm font-medium">
              Your rating
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <div key={star}>
                  <Star
                    className={cn(
                      'h-5 w-5',
                      star <= rating ? 'text-warning fill-warning/60' : 'text-text-muted/20'
                    )}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resources */}
        {resources.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {resources.map(({ href, icon: Icon, label, color, bg, hover }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'group border-border-light bg-surface-muted flex flex-col items-center justify-center gap-2.5 rounded-xl border p-3 text-center transition-all duration-200',
                  hover
                )}
              >
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl transition-transform group-hover:scale-110',
                    bg
                  )}
                >
                  <Icon className={cn('h-4 w-4', color)} />
                </div>
                <span className="text-text-primary text-xs font-semibold">
                  {label}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

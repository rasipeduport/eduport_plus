"""
Session domain helpers extracted from the views.

These keep the (intricate) scheduling rules in one place: title normalisation,
ISO datetime parsing, quota accounting, and conflict detection.
"""
from datetime import datetime
from django.db.models import Q
from django.utils import timezone

from .models import Session, SessionStatusChoices

ALLOWED_DURATIONS = [0.5, 1, 1.5, 2]
MAX_SERIES_ITEMS = 20


def normalize_title(title):
    if not title:
        return ""
    return " ".join(title.split())


def parse_iso_datetime(dt_str):
    """Parse an ISO 8601 string into a timezone-aware datetime, or None if invalid."""
    try:
        # standard ISO format: 2026-06-17T12:00:00Z -> timezone-aware datetime
        dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        if timezone.is_naive(dt):
            dt = timezone.make_aware(dt, timezone.utc)
        return dt
    except Exception:
        return None


def calculate_credits_used(student):
    """Total hours consumed by the student's non-cancelled sessions."""
    existing_sessions = Session.objects.filter(student=student).exclude(
        status=SessionStatusChoices.CANCELLED
    )
    credits_used = 0.0
    for s in existing_sessions:
        credits_used += (s.end_time - s.start_time).total_seconds() / 3600.0
    return credits_used


def find_conflict(student, tutor, start_time, end_time, exclude_id=None):
    """
    Return the first non-cancelled session that overlaps ``[start_time, end_time)``
    for the same student or the same tutor, or None if there is no conflict.
    """
    overlap_filters = Q(student=student)
    if tutor:
        overlap_filters |= Q(tutor=tutor)

    conflicts = Session.objects.filter(
        ~Q(status=SessionStatusChoices.CANCELLED),
        overlap_filters,
        start_time__lt=end_time,
        end_time__gt=start_time,
    )
    if exclude_id:
        conflicts = conflicts.exclude(id=exclude_id)
    return conflicts.first()

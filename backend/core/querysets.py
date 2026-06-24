"""
Shared helpers for restricting querysets by the requesting user's role.

Mentors and tutors only ever see the students (and the sessions of the students)
allocated to them; admins and other roles see everything passed in.
"""


def scope_students_by_role(qs, user):
    """Restrict a ``Student`` queryset to the rows a mentor/tutor may see."""
    if user.role == 'MENTOR':
        return qs.filter(mentor=user)
    if user.role == 'TUTOR':
        return qs.filter(tutor=user)
    return qs


def scope_sessions_by_role(qs, user):
    """Restrict a ``Session`` queryset to the rows a mentor/tutor may see."""
    if user.role == 'MENTOR':
        return qs.filter(student__mentor=user)
    if user.role == 'TUTOR':
        return qs.filter(student__tutor=user)
    return qs

"""
Helpers for the multi-profile (one parent account -> many students) model.

A parent account (``User`` with role STUDENT) may own several ``Student`` rows.
Which one the learn frontend is currently acting on is stored in the
``ep-student-id`` cookie. These helpers centralise reading that selection so
every student-facing endpoint scopes to the same child.
"""

EP_STUDENT_COOKIE = 'ep-student-id'


def get_account_students(user):
    """All students owned by this account, oldest admission first."""
    from students.models import Student
    return Student.objects.filter(profile=user).order_by('created_at')


def resolve_selected_student(request):
    """
    Return the ``Student`` the request is acting on, or ``None`` if it cannot
    be resolved unambiguously.

    Resolution order:
      1. The student named by the ``ep-student-id`` cookie, if it belongs to
         this account.
      2. The sole student, when the account owns exactly one.
      3. ``None`` -- the account owns several students and none is selected,
         so the caller should prompt the user to pick one.
    """
    students = list(get_account_students(request.user))
    if not students:
        return None

    selected_id = request.COOKIES.get(EP_STUDENT_COOKIE)
    if selected_id:
        for student in students:
            if str(student.id) == selected_id:
                return student

    if len(students) == 1:
        return students[0]

    return None

from rest_framework.permissions import BasePermission

STAFF_ROLES = ('ADMIN', 'MENTOR', 'TUTOR')


def _is_authenticated(request):
    return bool(request.user and request.user.is_authenticated)


class IsStaffUser(BasePermission):
    """Allows access only to Admin, Mentor, or Tutor roles, or superusers."""

    def has_permission(self, request, view):
        return (
            _is_authenticated(request)
            and (request.user.role in STAFF_ROLES or request.user.is_superuser)
        )


class IsStudentUser(BasePermission):
    """Allows access only to the Student role."""

    def has_permission(self, request, view):
        return _is_authenticated(request) and request.user.role == 'STUDENT'


class IsStaffOrSelfStudent(BasePermission):
    """
    Allow staff roles full access; students can only retrieve/GET (their own data).
    """

    def has_permission(self, request, view):
        if not _is_authenticated(request):
            return False

        if request.user.role in STAFF_ROLES or request.user.is_superuser:
            return True

        if request.user.role == 'STUDENT' and request.method == 'GET':
            return True

        return False


class IsAdminOrMentor(BasePermission):
    """Allows access only to users with the ADMIN or MENTOR roles, or superusers."""

    def has_permission(self, request, view):
        return (
            _is_authenticated(request)
            and (request.user.role in ('ADMIN', 'MENTOR') or request.user.is_superuser)
        )

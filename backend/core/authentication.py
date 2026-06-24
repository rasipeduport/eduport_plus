from rest_framework.authentication import SessionAuthentication


class CSRFExemptSessionAuthentication(SessionAuthentication):
    """
    Session authentication that skips Django's CSRF enforcement.

    Used by API endpoints that are called from the SPA frontends where CSRF is
    handled separately (or intentionally bypassed, e.g. logout).
    """

    def enforce_csrf(self, request):
        return  # Skip CSRF check

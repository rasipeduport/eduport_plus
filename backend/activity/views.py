from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils.dateparse import parse_datetime

from .models import ActivityLog
from .serializers import ActivityLogSerializer

User = get_user_model()

class ActivityLogPermission(BasePermission):
    """
    Access rules:
    - If filtering by a specific student (student_id), allow ADMIN, MENTOR, or TUTOR.
      - Mentors and Tutors are restricted to their own allocated students.
    - Otherwise (global audit log), restrict access to ADMIN only (or superusers).
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        student_id = request.query_params.get('student_id')
        if student_id:
            if request.user.role in ('ADMIN', 'MENTOR', 'TUTOR') or request.user.is_superuser:
                if request.user.role == 'MENTOR':
                    from students.models import Student
                    return Student.objects.filter(id=student_id, mentor=request.user).exists()
                elif request.user.role == 'TUTOR':
                    from students.models import Student
                    return Student.objects.filter(id=student_id, tutor=request.user).exists()
                return True
            return False

        # Global audit log: admins see everything; mentors/tutors are allowed
        # but their results are scoped to their own students in the view.
        return request.user.role in ('ADMIN', 'MENTOR', 'TUTOR') or request.user.is_superuser

class ActivityLogListView(APIView):
    """
    GET /api/activity/
    Returns list of activity logs matching query parameters.
    Supports pagination, filters, and full-text keyword search.
    """
    permission_classes = [IsAuthenticated, ActivityLogPermission]

    def get(self, request, *args, **kwargs):
        params = request.query_params
        
        # Base query
        queryset = ActivityLog.objects.all().order_by('-created_at')

        # Scope non-admin staff to their own students' activity plus their own actions
        user = request.user
        if not (user.role == 'ADMIN' or user.is_superuser):
            if user.role == 'MENTOR':
                queryset = queryset.filter(Q(student__mentor=user) | Q(actor=user))
            elif user.role == 'TUTOR':
                queryset = queryset.filter(Q(student__tutor=user) | Q(actor=user))

        # Filters
        student_id = params.get('student_id')
        if student_id:
            queryset = queryset.filter(student_id=student_id)

        action = params.get('action')
        if action:
            queryset = queryset.filter(action=action)

        entity_type = params.get('entity') or params.get('entity_type')
        if entity_type:
            queryset = queryset.filter(entity_type=entity_type)

        actor_id = params.get('actor') or params.get('actor_id')
        if actor_id:
            queryset = queryset.filter(actor_id=actor_id)

        from_date = params.get('from')
        if from_date:
            queryset = queryset.filter(created_at__gte=from_date)

        to_date = params.get('to')
        if to_date:
            queryset = queryset.filter(created_at__lte=to_date)

        # Keyword search
        q = params.get('q', '').strip()
        if q:
            # Clean special characters that might be passed in OR search
            safe_q = q.replace(',', ' ').replace('*', ' ').strip()
            if safe_q:
                # Support search by actor name, actor email, or entity label
                queryset = queryset.filter(
                    Q(actor_name__icontains=safe_q) |
                    Q(actor_email__icontains=safe_q) |
                    Q(entity_label__icontains=safe_q)
                )

        # Pagination
        try:
            page = max(1, int(params.get('page', 1)))
        except ValueError:
            page = 1

        try:
            page_size = max(1, int(params.get('page_size') or params.get('pageSize') or 25))
        except ValueError:
            page_size = 25

        total_count = queryset.count()
        offset = (page - 1) * page_size
        paginated_queryset = queryset[offset:offset + page_size]

        serializer = ActivityLogSerializer(paginated_queryset, many=True)

        response_data = {
            "results": serializer.data,
            "count": total_count,
            "page": page,
            "page_size": page_size
        }

        # If user is ADMIN, also include actor options for filter dropdowns
        if request.user.role == 'ADMIN' or request.user.is_superuser:
            actors = User.objects.all().order_by('full_name')
            response_data["actor_options"] = [
                {
                    "id": str(u.id),
                    "name": u.full_name or u.email
                }
                for u in actors
            ]

        return Response(response_data, status=status.HTTP_200_OK)

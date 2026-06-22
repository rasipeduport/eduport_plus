from rest_framework import serializers
from .models import ActivityLog

class ActivityLogSerializer(serializers.ModelSerializer):
    actor_id = serializers.PrimaryKeyRelatedField(source='actor', read_only=True)
    student_id = serializers.PrimaryKeyRelatedField(source='student', read_only=True)

    class Meta:
        model = ActivityLog
        fields = [
            'id',
            'created_at',
            'actor_id',
            'actor_email',
            'actor_name',
            'actor_role',
            'action',
            'entity_type',
            'entity_id',
            'entity_label',
            'student_id',
            'changes',
            'context'
        ]
        read_only_fields = fields

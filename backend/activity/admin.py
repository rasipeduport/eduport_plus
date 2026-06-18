from django.contrib import admin
from .models import ActivityLog

class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('action', 'entity_type', 'entity_label', 'actor_name', 'student', 'created_at')
    list_filter = ('entity_type', 'action', 'created_at', 'actor_role')
    search_fields = ('actor_name', 'actor_email', 'action', 'entity_type', 'entity_label', 'student__full_name')
    ordering = ('-created_at',)
    
    fieldsets = (
        (None, {'fields': ('action', 'created_at')}),
        ('Actor Info', {'fields': ('actor', 'actor_name', 'actor_email', 'actor_role')}),
        ('Entity Details', {'fields': ('entity_type', 'entity_id', 'entity_label', 'student')}),
        ('Payloads', {'fields': ('changes', 'context')}),
    )
    readonly_fields = ('created_at',)

admin.site.register(ActivityLog, ActivityLogAdmin)

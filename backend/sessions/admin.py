from django.contrib import admin
from .models import Session

class SessionAdmin(admin.ModelAdmin):
    list_display = ('title', 'student', 'tutor', 'start_time', 'end_time', 'status', 'rating')
    list_filter = ('status', 'rating', 'start_time')
    search_fields = ('title', 'student__full_name', 'student__student_code', 'tutor__full_name', 'tutor__email')
    ordering = ('-start_time',)
    
    fieldsets = (
        (None, {'fields': ('student', 'title', 'tutor')}),
        ('Schedule', {'fields': ('start_time', 'end_time')}),
        ('Links', {'fields': ('recording_link', 'notes_link', 'homework_link')}),
        ('Feedback & Status', {'fields': ('status', 'rating', 'cancellation_reason')}),
        ('Series Metadata', {'fields': ('series_id', 'class_number')}),
        ('Metadata', {'fields': ('created_at', 'updated_at')}),
    )
    readonly_fields = ('created_at', 'updated_at')

admin.site.register(Session, SessionAdmin)

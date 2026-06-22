from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

class UserAdmin(admin.ModelAdmin):
    list_display = ('email', 'full_name', 'role', 'is_active', 'is_staff', 'created_at')
    list_filter = ('role', 'is_active', 'is_staff', 'created_at')
    search_fields = ('email', 'full_name', 'mobile_number')
    ordering = ('-created_at',)
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('full_name', 'mobile_number', 'avatar_url', 'role')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Metadata', {'fields': ('invited_by', 'created_at', 'updated_at')}),
    )
    readonly_fields = ('created_at', 'updated_at')

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        # Auto-create whitelist invitation for users created/saved via Django Admin
        try:
            from invitations.models import Invitation, InvitationStatusChoices
            if not Invitation.objects.filter(email=obj.email).exists():
                Invitation.objects.create(
                    email=obj.email,
                    role=obj.role,
                    status=InvitationStatusChoices.ACCEPTED,
                    invited_by=obj.invited_by or request.user,
                    extra_data={
                        "full_name": obj.full_name or "",
                        "mobile_number": obj.mobile_number or ""
                    }
                )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to auto-create whitelist invitation in Admin for {obj.email}: {e}")

admin.site.register(User, UserAdmin)

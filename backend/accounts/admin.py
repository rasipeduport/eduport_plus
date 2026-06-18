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

admin.site.register(User, UserAdmin)

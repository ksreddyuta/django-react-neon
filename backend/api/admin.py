from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, DeviceGroup, DeviceGroupMember, ExportedFile

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ('email', 'role', 'is_staff', 'is_active', 'date_joined')
    list_filter = ('role', 'is_staff', 'is_active')
    search_fields = ('email',)
    ordering = ('email',)
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Permissions', {'fields': ('role', 'is_staff', 'is_active', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'role', 'is_staff', 'is_active')}
        ),
    )

@admin.register(DeviceGroup)
class DeviceGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'created_at', 'updated_at')
    search_fields = ('name', 'description')

@admin.register(DeviceGroupMember)
class DeviceGroupMemberAdmin(admin.ModelAdmin):
    list_display = ('group', 'device_name', 'created_at')
    list_filter = ('group',)
    search_fields = ('device_name',)

@admin.register(ExportedFile)
class ExportedFileAdmin(admin.ModelAdmin):
    list_display = ('filename', 'file_type', 'device_id', 'pollutant', 'created_by', 'created_at', 'expires_at')
    list_filter = ('file_type', 'created_at')
    search_fields = ('filename', 'device_id', 'pollutant')
    readonly_fields = ('created_at',)
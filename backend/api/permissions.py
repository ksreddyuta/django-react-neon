from rest_framework import permissions

class IsAdminUser(permissions.BasePermission):
    """
    Allows access only to admin users.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_admin()

class IsSuperAdminUser(permissions.BasePermission):
    """
    Allows access only to superadmin users.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_superadmin()

class CanExportData(permissions.BasePermission):
    """
    Allows data export only to admin users.
    """
    def has_permission(self, request, view):
        # Check if this is an export request
        is_export_request = (
            request.method == 'GET' and 
            request.GET.get('format') == 'csv'
        )
        
        # For export functionality, check if user is admin
        if is_export_request:
            return request.user and request.user.is_authenticated and request.user.is_admin()
        
        # Allow all other requests (non-export)
        return True

class CanAccessData(permissions.BasePermission):
    """
    Allows data access to authenticated users, but export only to admins.
    """
    def has_permission(self, request, view):
        # For data access, allow all authenticated users
        if request.user and request.user.is_authenticated:
            return True
        
        # Allow public access to devices and pollutants list
        if view.__class__.__name__ in ['get_devices', 'get_pollutants', 'get_pollutant_stats', 'get_battery_stats', 'get_latest_dates']:
            return True
            
        return False
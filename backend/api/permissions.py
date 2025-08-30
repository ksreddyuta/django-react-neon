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
        # For CSV export functionality, check if user is admin
        if (request.method == 'GET' and 
            'format' in request.GET and 
            request.GET['format'] == 'csv'):
            return request.user and request.user.is_authenticated and request.user.is_admin()
        # Allow all other requests
        return True
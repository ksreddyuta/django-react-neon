from django.http import JsonResponse

def root_view(request):
    return JsonResponse({
        "message": "Welcome to Django React Neon API",
        "endpoints": {
            "admin": "/admin/",
            "api": {
                "register": "/api/register/",
                "login": "/api/login/",
                "protected": "/api/protected/",
                "health": "/api/health/"
            }
        }
    })
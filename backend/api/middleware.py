import logging
import time

from django.conf import settings

logger = logging.getLogger(__name__)

class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = time.time()
        response = self.get_response(request)
        duration = time.time() - start_time
        
        log_data = {
            'method': request.method,
            'path': request.path,
            'status': response.status_code,
            'duration': f"{duration:.2f}s",
            'client_ip': request.META.get('REMOTE_ADDR')
        }
        
        if response.status_code >= 500:
            logger.error("Server error: %s", log_data)
        elif response.status_code >= 400:
            logger.warning("Client error: %s", log_data)
        else:
            logger.info("Request processed: %s", log_data)
            
        return response

class QueryTimingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Start time
        start_time = time.time()
        
        # Process the request
        response = self.get_response(request)
        
        # Calculate total time
        total_time = time.time() - start_time
        
        # Log slow requests
        if total_time > 2:  # More than 2 seconds is considered slow
            logger.warning(
                f"Slow request: {request.path} - "
                f"Total time: {total_time:.2f}s"
            )
        
        # Log all requests in development
        if settings.DEBUG:
            logger.debug(
                f"Request: {request.path} - "
                f"Total time: {total_time:.2f}s"
            )
        
        return response
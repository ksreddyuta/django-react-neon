import logging
import time

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
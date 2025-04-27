"""Debug middleware for Django.

This module provides middleware for debugging Django applications.
"""

class DebugMiddleware:
    """Middleware for debugging Django applications.
    
    This middleware can be used to debug requests and responses.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Code to be executed for each request before
        # the view (and later middleware) are called.
        
        response = self.get_response(request)
        
        # Code to be executed for each request/response after
        # the view is called.
        
        return response
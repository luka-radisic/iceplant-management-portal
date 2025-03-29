import re
from django.middleware.gzip import GZipMiddleware


class CustomCompressionMiddleware(GZipMiddleware):
    """
    Custom compression middleware that extends Django's GZipMiddleware
    to provide Brotli compression if available, falling back to gzip.
    """
    
    def __init__(self, get_response=None):
        self.get_response = get_response
        self.brotli_available = False
        
        # Check if Brotli compression is available
        try:
            import brotli
            self.brotli_available = True
        except ImportError:
            # Brotli module not installed, will use gzip only
            pass
            
    def process_response(self, request, response):
        # Check if the response should be compressed
        if not self._should_compress(request, response):
            return response
        
        # Check if client accepts Brotli compression
        accept_encoding = request.META.get('HTTP_ACCEPT_ENCODING', '')
        
        if self.brotli_available and 'br' in accept_encoding:
            # Use Brotli compression if available and accepted by client
            import brotli
            if hasattr(response, 'content'):
                # Compress content with Brotli
                compressed_content = brotli.compress(response.content)
                response.content = compressed_content
                response['Content-Encoding'] = 'br'
                response['Content-Length'] = str(len(compressed_content))
                return response
        
        # Fall back to standard gzip compression
        return super().process_response(request, response)
        
    def _should_compress(self, request, response):
        # Don't compress if response code is not 200
        if response.status_code != 200:
            return False
            
        # Don't compress if the response is already compressed
        if 'Content-Encoding' in response:
            return False
            
        # Don't compress if this is a streaming response
        if not hasattr(response, 'content'):
            return False
            
        # Don't compress very small responses
        if len(response.content) < 200:  # Skip compressing tiny responses
            return False
            
        # Check content type
        content_type = response.get('Content-Type', '')
        if not content_type:
            return False
            
        # Compress HTML, CSS, JavaScript, JSON, SVG, XML, and plain text
        compressible = re.search(r'(text/|application/json|application/javascript|application/xml|svg+xml)', content_type)
        return bool(compressible) 
import time

class DebugMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        print("DEBUG: DebugMiddleware initialized")

    def __call__(self, request):
        start_time = time.time()
        print(f"DEBUG: DebugMiddleware - Processing request for {request.path}")

        response = self.get_response(request)

        end_time = time.time()
        print(f"DEBUG: DebugMiddleware - Finished processing request for {request.path} in {end_time - start_time:.4f} seconds")
        return response
from flask import request, Response
import functools

def cors_middleware(allowed_origins=None, allowed_methods=None, allowed_headers=None):
    """
    A decorator to handle CORS for specific routes

    Args:
        allowed_origins: List of allowed origins or '*' for all
        allowed_methods: List of allowed HTTP methods
        allowed_headers: List of allowed headers
    """
    if allowed_origins is None:
        allowed_origins = ['http://localhost:3000', 'https://mizizzi.com']
    if allowed_methods is None:
        allowed_methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    if allowed_headers is None:
        allowed_headers = ['Content-Type', 'Authorization', 'X-Requested-With']

    def decorator(f):
        @functools.wraps(f)
        def wrapped(*args, **kwargs):
            # Get the origin from the request
            origin = request.headers.get('Origin', '')

            # Check if the origin is allowed
            if '*' in allowed_origins or origin in allowed_origins:
                # For OPTIONS requests, return a response with CORS headers
                if request.method == 'OPTIONS':
                    response = Response('')
                    response.headers['Access-Control-Allow-Origin'] = origin
                    response.headers['Access-Control-Allow-Methods'] = ', '.join(allowed_methods)
                    response.headers['Access-Control-Allow-Headers'] = ', '.join(allowed_headers)
                    response.headers['Access-Control-Allow-Credentials'] = 'true'
                    response.headers['Access-Control-Max-Age'] = '3600'  # Cache preflight for 1 hour
                    return response, 204

                # For other requests, call the original function
                result = f(*args, **kwargs)

                # If the result is a tuple (response, status_code), extract the response
                if isinstance(result, tuple) and len(result) >= 2:
                    response, status_code = result[0], result[1]
                    extra = result[2:] if len(result) > 2 else ()

                    # If the response is a Response object, add CORS headers
                    if isinstance(response, Response):
                        response.headers['Access-Control-Allow-Origin'] = origin
                        response.headers['Access-Control-Allow-Methods'] = ', '.join(allowed_methods)
                        response.headers['Access-Control-Allow-Headers'] = ', '.join(allowed_headers)
                        response.headers['Access-Control-Allow-Credentials'] = 'true'

                        # Return the response with the status code and any extra items
                        if extra:
                            return (response, status_code) + extra
                        return response, status_code

                    # If the response is not a Response object, create one
                    response_obj = Response(response)
                    response_obj.status_code = status_code
                    response_obj.headers['Access-Control-Allow-Origin'] = origin
                    response_obj.headers['Access-Control-Allow-Methods'] = ', '.join(allowed_methods)
                    response_obj.headers['Access-Control-Allow-Headers'] = ', '.join(allowed_headers)
                    response_obj.headers['Access-Control-Allow-Credentials'] = 'true'

                    # Return the response with any extra items
                    if extra:
                        return (response_obj,) + extra
                    return response_obj

                # If the result is a Response object, add CORS headers
                if isinstance(result, Response):
                    result.headers['Access-Control-Allow-Origin'] = origin
                    result.headers['Access-Control-Allow-Methods'] = ', '.join(allowed_methods)
                    result.headers['Access-Control-Allow-Headers'] = ', '.join(allowed_headers)
                    result.headers['Access-Control-Allow-Credentials'] = 'true'
                    return result

                # If the result is not a Response object, create one
                response = Response(result)
                response.headers['Access-Control-Allow-Origin'] = origin
                response.headers['Access-Control-Allow-Methods'] = ', '.join(allowed_methods)
                response.headers['Access-Control-Allow-Headers'] = ', '.join(allowed_headers)
                response.headers['Access-Control-Allow-Credentials'] = 'true'
                return response

            # If the origin is not allowed, call the original function
            return f(*args, **kwargs)

        return wrapped

    return decorator

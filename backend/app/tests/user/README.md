# User Authentication Test Suite

This directory contains comprehensive tests for the Flask authentication routes in `user.py`.

## Test Structure

\`\`\`
backend/tests/
├── conftest.py                    # Pytest configuration and shared fixtures
├── test_user_auth.py             # Main authentication tests
├── test_user_auth_integration.py # Integration tests for complete flows
├── pytest.ini                   # Pytest configuration
├── requirements-test.txt         # Test dependencies
├── run_tests.sh                 # Test runner script
└── README.md                    # This file
\`\`\`

## Prerequisites

1. **Install Dependencies**:
   \`\`\`bash
   cd backend
   pip install -r tests/requirements-test.txt
   \`\`\`

2. **Set Environment Variables**:
   \`\`\`bash
   export FLASK_ENV=testing
   export TESTING=True
   export PYTHONPATH="${PYTHONPATH}:$(pwd)"
   \`\`\`

3. **Database Setup**:
   The tests use an in-memory SQLite database that's automatically created and destroyed for each test session.

## Running Tests

### Quick Start

\`\`\`bash
# Navigate to backend directory
cd backend

# Run all tests
python -m pytest tests/

# Or use the test runner script
chmod +x tests/run_tests.sh
./tests/run_tests.sh
\`\`\`

### Test Categories

#### 1. Unit Tests
Tests individual functions and endpoints in isolation:

\`\`\`bash
# Run only unit tests
./tests/run_tests.sh unit

# Or with pytest directly
python -m pytest tests/test_user_auth.py -m unit -v
\`\`\`

#### 2. Integration Tests
Tests complete user flows and component interactions:

\`\`\`bash
# Run only integration tests
./tests/run_tests.sh integration

# Or with pytest directly
python -m pytest tests/test_user_auth_integration.py -m integration -v
\`\`\`

#### 3. Fast Tests
Exclude slow-running tests for quick feedback:

\`\`\`bash
# Run fast tests only
./tests/run_tests.sh fast

# Or with pytest directly
python -m pytest tests/ -m "not slow" -v
\`\`\`

#### 4. Coverage Analysis
Generate detailed coverage reports:

\`\`\`bash
# Run with coverage
./tests/run_tests.sh coverage

# Or with pytest directly
python -m pytest tests/ --cov=backend.routes.user.user --cov-report=html --cov-report=term-missing
\`\`\`

### Advanced Test Options

#### Parallel Testing
Run tests in parallel for faster execution:

\`\`\`bash
python -m pytest tests/ -n auto
\`\`\`

#### Specific Test Classes or Methods
\`\`\`bash
# Run specific test class
python -m pytest tests/test_user_auth.py::TestUserAuth -v

# Run specific test method
python -m pytest tests/test_user_auth.py::TestUserAuth::test_register_with_email_success -v
\`\`\`

#### Verbose Output with Details
\`\`\`bash
python -m pytest tests/ -v --tb=long --capture=no
\`\`\`

#### Generate HTML Report
\`\`\`bash
python -m pytest tests/ --html=test_results/report.html --self-contained-html
\`\`\`

## Test Coverage

The test suite covers the following authentication routes:

### Registration Routes
- ✅ `POST /api/register` - User registration with email/phone
- ✅ Email/phone validation and duplicate checking
- ✅ Password strength validation
- ✅ Verification code generation and sending

### Verification Routes
- ✅ `POST /api/verify-code` - Email/phone verification
- ✅ `POST /api/resend-verification` - Resend verification codes
- ✅ `GET /api/verify-email` - Email verification via link

### Authentication Routes
- ✅ `POST /api/login` - User login with email/phone
- ✅ `POST /api/logout` - User logout
- ✅ `POST /api/refresh` - JWT token refresh

### Password Management
- ✅ `POST /api/forgot-password` - Password reset request
- ✅ `POST /api/reset-password` - Password reset with token
- ✅ `POST /api/change-password` - Change password (authenticated)

### Profile Management
- ✅ `GET /api/profile` - Get user profile
- ✅ `PUT /api/profile` - Update user profile
- ✅ `POST /api/delete-account` - Delete user account

### Utility Routes
- ✅ `POST /api/check-availability` - Check email/phone availability
- ✅ `POST /api/auth/csrf` - CSRF token generation

### Payment Integration
- ✅ `POST /api/mpesa/initiate` - M-PESA payment initiation
- ✅ `OPTIONS /api/mpesa/initiate` - CORS preflight

### OAuth Integration
- ✅ `POST /api/auth/google` - Google OAuth login

## Test Scenarios

### Success Scenarios
- Valid user registration and verification
- Successful login with email/phone
- Profile updates and password changes
- Token refresh and logout
- Password reset flow
- Google OAuth integration
- M-PESA payment initiation

### Failure Scenarios
- Invalid input validation
- Duplicate email/phone registration
- Wrong credentials and unverified accounts
- Expired tokens and verification codes
- Missing required fields
- Unauthorized access attempts
- Rate limiting and security measures

### Edge Cases
- Malformed JSON requests
- SQL injection attempts
- XSS prevention
- Concurrent operations
- Large payload handling
- Special characters in input

## Mocking Strategy

The tests mock external services to ensure isolation:

### Email Service (Brevo)
```python
@patch('backend.routes.user.user.send_email')
def test_email_functionality(mock_send_email, client):
    mock_send_email.return_value = True
    # Test implementation

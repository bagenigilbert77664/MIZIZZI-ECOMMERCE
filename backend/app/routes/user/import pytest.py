import pytest
from unittest.mock import patch, Mock
from flask import Flask, current_app
from .user import send_email

# File: backend/app/routes/user/test_user.py



@pytest.fixture
def app_context():
    app = Flask(__name__)
    app.config['BREVO_API_KEY'] = 'test-api-key'
    with app.app_context():
        yield app

def test_send_email_success(app_context):
    with patch('requests.post') as mock_post:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response

        result = send_email('test@example.com', 'Subject', '<b>Body</b>')
        assert result is True
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        assert kwargs['headers']['api-key'] == 'test-api-key'
        assert kwargs['json']['to'][0]['email'] == 'test@example.com'

def test_send_email_failure_status(app_context):
    with patch('requests.post') as mock_post:
        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.text = 'Bad Request'
        mock_post.return_value = mock_response

        result = send_email('fail@example.com', 'Subject', '<b>Body</b>')
        assert result is False
        mock_post.assert_called_once()

def test_send_email_no_api_key():
    app = Flask(__name__)
    app.config['BREVO_API_KEY'] = ''
    with app.app_context():
        result = send_email('noapikey@example.com', 'Subject', '<b>Body</b>')
        assert result is False

def test_send_email_exception(app_context):
    with patch('requests.post', side_effect=Exception('Network error')):
        result = send_email('error@example.com', 'Subject', '<b>Body</b>')
        assert result is False
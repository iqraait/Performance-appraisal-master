
"""
Django settings for appraisal_system project.
Local development and production-compatible configuration.
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Environment variable loading (supports local backend/.env and production backend/.env.production)
env_file_name = os.getenv("DJANGO_ENV_FILE")
if env_file_name and (BASE_DIR / env_file_name).exists():
    env_file = BASE_DIR / env_file_name
elif (BASE_DIR / ".env.production").exists() and not (BASE_DIR / ".env").exists():
    env_file = BASE_DIR / ".env.production"
elif (BASE_DIR / ".env").exists():
    env_file = BASE_DIR / ".env"
else:
    env_file = None

if env_file:
    try:
        from dotenv import load_dotenv
        # override=False ensures OS/systemd environment variables take precedence
        load_dotenv(env_file, override=False)
    except ImportError:
        try:
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        # setdefault ensures systemd variables are not overwritten
                        os.environ.setdefault(k.strip(), v.strip().strip("'\""))
        except Exception:
            pass

# Security
SECRET_KEY = os.getenv(
    "DJANGO_SECRET_KEY",
    "django-insecure-=@w!53w=po-euh@ms(20@2dtx&bpoog22+1c9v&g+ou6gs^b_z",
)

# Local development defaults to DEBUG=True; production sets DJANGO_DEBUG=False
DEBUG = os.getenv("DJANGO_DEBUG", "True").lower() in ("true", "1", "yes")

# ALLOWED_HOSTS: Read from DJANGO_ALLOWED_HOSTS without wildcard '*', includes 172.16.21.161 by default
DEFAULT_ALLOWED_HOSTS = "172.16.21.161,localhost,127.0.0.1,0.0.0.0,testserver"
ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv("DJANGO_ALLOWED_HOSTS", DEFAULT_ALLOWED_HOSTS).split(",")
    if host.strip()
]

# Applications — unchanged
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework.authtoken",
    "appraisal",
]

# Middleware — unchanged
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "appraisal_system.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "appraisal_system.wsgi.application"

# Database — existing SQLite path unchanged
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# Password validation — unchanged
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# Internationalization — unchanged
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = "/static/"
STATICFILES_DIRS = [BASE_DIR / "static"]
STATIC_ROOT = BASE_DIR / "staticfiles"

# CORS — local development allows Vite, production uses explicit origins
CORS_ALLOW_ALL_ORIGINS = DEBUG
DEFAULT_CORS_ORIGINS = "http://172.16.21.161:5173,http://localhost:5173,http://127.0.0.1:5173"
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "DJANGO_CORS_ALLOWED_ORIGINS",
        DEFAULT_CORS_ORIGINS if DEBUG else "",
    ).split(",")
    if origin.strip()
]

# Django REST Framework — unchanged
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Email — unchanged
DEFAULT_FROM_EMAIL = "HR@IQRAAHOSPITAL.IN"
SERVER_EMAIL = "HR@IQRAAHOSPITAL.IN"

EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    "django.core.mail.backends.smtp.EmailBackend",
)
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True").lower() in (
    "true",
    "1",
    "yes",
)
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "HR@IQRAAHOSPITAL.IN")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_TIMEOUT = 10

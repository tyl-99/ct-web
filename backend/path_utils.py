"""
Path utilities for data storage
Handles different environments (development, production, hosting)
"""

import os
from pathlib import Path
from typing import Optional


def get_data_directory() -> Path:
    """
    Get the data directory path based on environment.
    
    Priority:
    1. DATA_DIR environment variable (for hosting platforms)
    2. Frontend public/data directory (development)
    3. ./data directory (fallback)
    
    Returns:
        Path to data directory
    """
    # Check for explicit data directory (for hosting)
    data_dir = os.getenv('DATA_DIR')
    if data_dir:
        return Path(data_dir).resolve()
    
    # Check if we're in a Next.js environment (production build)
    # In Next.js, process.cwd() is the project root
    project_root = Path.cwd()
    
    # Try frontend/public/data (development)
    frontend_data = project_root / 'frontend' / 'public' / 'data'
    if frontend_data.exists() or project_root.name == 'frontend':
        # If we're in frontend directory, go up one level
        if project_root.name == 'frontend':
            return (project_root / 'public' / 'data').resolve()
        return frontend_data.resolve()
    
    # Fallback: create data directory in project root
    data_dir = project_root / 'data'
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir.resolve()


def get_backend_directory() -> Path:
    """
    Get the backend directory path.
    
    Returns:
        Path to backend directory
    """
    # Check if we're already in backend directory
    current = Path.cwd()
    if current.name == 'backend':
        return current.resolve()
    
    # Try to find backend directory relative to current
    backend_dir = current / 'backend'
    if backend_dir.exists():
        return backend_dir.resolve()
    
    # If we're in frontend, go up one level
    if current.name == 'frontend':
        backend_dir = current.parent / 'backend'
        if backend_dir.exists():
            return backend_dir.resolve()
    
    # Fallback: assume we're in project root
    return current.resolve()


def get_account_config_path() -> Path:
    """
    Get the path to accounts_config.json.
    
    Returns:
        Path to accounts config file
    """
    backend_dir = get_backend_directory()
    return backend_dir / 'accounts_config.json'




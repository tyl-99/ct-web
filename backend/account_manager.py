"""
Account Management Utility
Handles reading/writing account configuration from JSON file
"""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from dotenv import load_dotenv


class AccountManager:
    """Manages account configuration stored in JSON file"""
    
    def __init__(self, config_path: Optional[Path] = None):
        """
        Initialize AccountManager
        
        Args:
            config_path: Path to accounts config file. If None, uses backend/accounts_config.json
        """
        if config_path is None:
            from path_utils import get_account_config_path
            config_path = get_account_config_path()
        
        self.config_path = config_path
        self._ensure_config_exists()
    
    def _ensure_config_exists(self):
        """Ensure config file exists, create with default from .env if needed"""
        if not self.config_path.exists():
            # Try to load from .env as fallback
            load_dotenv()
            account_id = os.getenv("CTRADER_ACCOUNT_ID")
            
            if account_id:
                # Create config with account from .env
                default_config = {
                    "accounts": [
                        {
                            "id": account_id,
                            "name": f"Account {account_id}",
                            "enabled": True,
                            "created_at": datetime.now().isoformat()
                        }
                    ]
                }
                self._write_config(default_config)
            else:
                # Create empty config
                default_config = {"accounts": []}
                self._write_config(default_config)
    
    def _read_config(self) -> Dict:
        """Read config from JSON file"""
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError) as e:
            # Return default config if file is corrupted or missing
            default_config = {"accounts": []}
            self._write_config(default_config)
            return default_config
    
    def _write_config(self, config: Dict):
        """Write config to JSON file"""
        self.config_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.config_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
    
    def get_accounts(self) -> List[Dict]:
        """Get all accounts"""
        config = self._read_config()
        return config.get("accounts", [])
    
    def get_enabled_accounts(self) -> List[str]:
        """Get list of enabled account IDs"""
        accounts = self.get_accounts()
        return [acc["id"] for acc in accounts if acc.get("enabled", True)]
    
    def get_account(self, account_id: str) -> Optional[Dict]:
        """Get account by ID"""
        accounts = self.get_accounts()
        for acc in accounts:
            if acc["id"] == account_id:
                return acc
        return None
    
    def add_account(self, account_id: str, name: Optional[str] = None) -> bool:
        """
        Add a new account
        
        Args:
            account_id: Account ID to add
            name: Optional account name. If None, uses "Account {account_id}"
        
        Returns:
            True if added successfully, False if account already exists
        """
        config = self._read_config()
        accounts = config.get("accounts", [])
        
        # Check if account already exists
        if any(acc["id"] == account_id for acc in accounts):
            return False
        
        # Add new account
        new_account = {
            "id": account_id,
            "name": name or f"Account {account_id}",
            "enabled": True,
            "created_at": datetime.now().isoformat()
        }
        accounts.append(new_account)
        config["accounts"] = accounts
        
        self._write_config(config)
        return True
    
    def delete_account(self, account_id: str) -> bool:
        """
        Delete an account
        
        Args:
            account_id: Account ID to delete
        
        Returns:
            True if deleted successfully, False if account not found
        """
        config = self._read_config()
        accounts = config.get("accounts", [])
        
        # Find and remove account
        original_length = len(accounts)
        accounts = [acc for acc in accounts if acc["id"] != account_id]
        
        if len(accounts) < original_length:
            config["accounts"] = accounts
            self._write_config(config)
            return True
        
        return False
    
    def update_account(self, account_id: str, **updates) -> bool:
        """
        Update account properties
        
        Args:
            account_id: Account ID to update
            **updates: Properties to update (e.g., name="New Name", enabled=False)
        
        Returns:
            True if updated successfully, False if account not found
        """
        config = self._read_config()
        accounts = config.get("accounts", [])
        
        # Find and update account
        for acc in accounts:
            if acc["id"] == account_id:
                acc.update(updates)
                acc["updated_at"] = datetime.now().isoformat()
                config["accounts"] = accounts
                self._write_config(config)
                return True
        
        return False
    
    def validate_account_id(self, account_id: str) -> bool:
        """
        Validate account ID format
        
        Args:
            account_id: Account ID to validate
        
        Returns:
            True if valid, False otherwise
        """
        try:
            # Account ID should be numeric and reasonable length
            int(account_id)
            return len(account_id) > 0 and len(account_id) <= 20
        except ValueError:
            return False
    
    def get_accounts_with_data_status(self) -> List[Dict]:
        """
        Get all accounts (no data status checking - data is checked directly from Firestore when needed).
        """
        return self.get_accounts()
    
    def trigger_data_fetch(self, account_id: Optional[str] = None) -> bool:
        """
        Trigger data fetching for account(s)
        
        Args:
            account_id: Specific account ID to fetch, or None to fetch all enabled accounts
        
        Returns:
            True if fetch was triggered successfully
        """
        import subprocess
        import sys
        from pathlib import Path
        
        # Get path to data processor
        backend_dir = Path(__file__).parent
        data_processor = backend_dir / 'data_processor.py'
        
        if not data_processor.exists():
            return False
        
        try:
            # Run data processor in background
            # Use the same conda environment setup as the CLI
            cmd = ['conda', 'run', '-n', 'trader-env', 'python', str(data_processor)]
            
            # Start process in background (detached, no window)
            if sys.platform == 'win32':
                # Windows: suppress command prompt window
                import subprocess
                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                startupinfo.wShowWindow = subprocess.SW_HIDE
                subprocess.Popen(
                    cmd,
                    cwd=str(backend_dir),
                    startupinfo=startupinfo,
                    creationflags=subprocess.CREATE_NO_WINDOW | subprocess.CREATE_NEW_PROCESS_GROUP,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    shell=False
                )
            else:
                # Unix: use nohup-like behavior
                subprocess.Popen(
                    cmd,
                    cwd=str(backend_dir),
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    start_new_session=True
                )
            return True
        except Exception as e:
            print(f"Error triggering data fetch: {e}")
            return False


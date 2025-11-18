"""
CLI interface for AccountManager
Used by Next.js API routes to manage accounts
"""

import sys
import json
import argparse
from account_manager import AccountManager


def main():
    parser = argparse.ArgumentParser(description='Account Manager CLI')
    subparsers = parser.add_subparsers(dest='command', help='Command to execute')
    
    # List accounts
    subparsers.add_parser('list', help='List all accounts')
    
    # Get account
    get_parser = subparsers.add_parser('get', help='Get account by ID')
    get_parser.add_argument('account_id', help='Account ID')
    
    # Add account
    add_parser = subparsers.add_parser('add', help='Add new account')
    add_parser.add_argument('account_id', help='Account ID')
    add_parser.add_argument('--name', help='Account name (optional)')
    
    # Delete account
    delete_parser = subparsers.add_parser('delete', help='Delete account')
    delete_parser.add_argument('account_id', help='Account ID')
    
    # Update account
    update_parser = subparsers.add_parser('update', help='Update account')
    update_parser.add_argument('account_id', help='Account ID')
    update_parser.add_argument('--name', help='Account name')
    update_parser.add_argument('--enabled', type=lambda x: x.lower() == 'true', help='Enable/disable account')
    
    # Validate account ID
    validate_parser = subparsers.add_parser('validate', help='Validate account ID')
    validate_parser.add_argument('account_id', help='Account ID to validate')
    
    # Fetch data
    fetch_parser = subparsers.add_parser('fetch-data', help='Trigger data fetching')
    fetch_parser.add_argument('--account-id', help='Specific account ID to fetch (optional, fetches all if not provided)')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    am = AccountManager()
    result = {}
    
    try:
        if args.command == 'list':
            # Include data status in list
            accounts = am.get_accounts_with_data_status()
            result = {'success': True, 'accounts': accounts}
            
        elif args.command == 'get':
            account = am.get_account(args.account_id)
            if account:
                result = {'success': True, 'account': account}
            else:
                result = {'success': False, 'error': 'Account not found'}
                
        elif args.command == 'add':
            # Validate first
            if not am.validate_account_id(args.account_id):
                result = {'success': False, 'error': 'Invalid account ID format'}
            elif am.get_account(args.account_id):
                result = {'success': False, 'error': 'Account already exists'}
            else:
                success = am.add_account(args.account_id, args.name)
                if success:
                    account = am.get_account(args.account_id)
                    # Automatically trigger data fetch for new account
                    fetch_triggered = am.trigger_data_fetch()
                    result = {
                        'success': True, 
                        'account': account,
                        'data_fetch_triggered': fetch_triggered
                    }
                else:
                    result = {'success': False, 'error': 'Failed to add account'}
                    
        elif args.command == 'delete':
            success = am.delete_account(args.account_id)
            result = {'success': success}
            if not success:
                result['error'] = 'Account not found'
                
        elif args.command == 'update':
            updates = {}
            if args.name is not None:
                updates['name'] = args.name
            if args.enabled is not None:
                updates['enabled'] = args.enabled
                
            if not updates:
                result = {'success': False, 'error': 'No updates provided'}
            else:
                success = am.update_account(args.account_id, **updates)
                if success:
                    account = am.get_account(args.account_id)
                    result = {'success': True, 'account': account}
                else:
                    result = {'success': False, 'error': 'Account not found'}
                    
        elif args.command == 'validate':
            is_valid = am.validate_account_id(args.account_id)
            exists = am.get_account(args.account_id) is not None
            result = {
                'success': True,
                'valid': is_valid,
                'exists': exists
            }
            if not is_valid:
                result['error'] = 'Invalid account ID format'
            elif exists:
                result['error'] = 'Account already exists'
        
        elif args.command == 'fetch-data':
            fetch_triggered = am.trigger_data_fetch(args.account_id)
            if fetch_triggered:
                result = {
                    'success': True,
                    'message': f'Data fetch triggered for {"account " + args.account_id if args.account_id else "all enabled accounts"}'
                }
            else:
                result = {'success': False, 'error': 'Failed to trigger data fetch'}
                
    except Exception as e:
        result = {'success': False, 'error': str(e)}
    
    print(json.dumps(result))
    
    if not result.get('success', False):
        sys.exit(1)

if __name__ == '__main__':
    main()


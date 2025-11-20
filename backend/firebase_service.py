import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import firebase_admin
from firebase_admin import credentials, firestore

_db: Optional[firestore.Client] = None


def _load_credentials() -> credentials.Certificate:
    # Support multiple environment variable names for compatibility
    # Priority: FIREBASE_ADMIN_CREDENTIALS > FIREBASE_ADMIN_CREDENTIALS_PATH > FIREBASE_CREDENTIALS > FIREBASE_CREDENTIALS_JSON
    
    # Check for FIREBASE_ADMIN_CREDENTIALS (matches frontend and Railway deployment)
    admin_cred_json = os.getenv("FIREBASE_ADMIN_CREDENTIALS")
    admin_cred_path = os.getenv("FIREBASE_ADMIN_CREDENTIALS_PATH")
    
    # Legacy variable names (for backward compatibility)
    cred_path = os.getenv("FIREBASE_CREDENTIALS")
    cred_json = os.getenv("FIREBASE_CREDENTIALS_JSON")
    
    # Try FIREBASE_ADMIN_CREDENTIALS (JSON string)
    if admin_cred_json:
        cred_str = admin_cred_json.strip()
        # Check if it's a JSON string (starts with {)
        if cred_str.startswith('{'):
            try:
                return credentials.Certificate(json.loads(cred_str))
            except json.JSONDecodeError as exc:
                raise RuntimeError("FIREBASE_ADMIN_CREDENTIALS is not valid JSON") from exc
        # Otherwise treat as file path
        path = Path(cred_str).expanduser()
        if path.exists():
            return credentials.Certificate(str(path))
    
    # Try FIREBASE_ADMIN_CREDENTIALS_PATH (file path)
    if admin_cred_path:
        path = Path(admin_cred_path).expanduser()
        if not path.exists():
            raise RuntimeError(f"FIREBASE_ADMIN_CREDENTIALS_PATH file not found at {path}")
        return credentials.Certificate(str(path))
    
    # Try legacy FIREBASE_CREDENTIALS (file path)
    if cred_path:
        path = Path(cred_path).expanduser()
        if not path.exists():
            raise RuntimeError(f"FIREBASE_CREDENTIALS file not found at {path}")
        return credentials.Certificate(str(path))

    # Try legacy FIREBASE_CREDENTIALS_JSON (JSON string)
    if cred_json:
        try:
            return credentials.Certificate(json.loads(cred_json))
        except json.JSONDecodeError as exc:
            raise RuntimeError("FIREBASE_CREDENTIALS_JSON is not valid JSON") from exc

    raise RuntimeError(
        "Firebase credentials are missing. Set one of:\n"
        "  - FIREBASE_ADMIN_CREDENTIALS (JSON string or file path)\n"
        "  - FIREBASE_ADMIN_CREDENTIALS_PATH (file path)\n"
        "  - FIREBASE_CREDENTIALS (file path, legacy)\n"
        "  - FIREBASE_CREDENTIALS_JSON (JSON string, legacy)"
    )


def get_db() -> firestore.Client:
    global _db
    if _db is not None:
        return _db

    if not firebase_admin._apps:
        try:
            cred = _load_credentials()
            firebase_admin.initialize_app(cred)
        except RuntimeError as e:
            # Re-raise credential loading errors with helpful message
            raise RuntimeError(
                f"Failed to load Firebase credentials: {e}\n"
                "Please check your environment variables and ensure the credentials are valid."
            ) from e
        except Exception as e:
            # Handle other initialization errors (e.g., invalid JWT signature)
            raise RuntimeError(
                f"Failed to initialize Firebase Admin: {e}\n"
                "This usually means:\n"
                "  1. The credentials JSON is invalid or corrupted\n"
                "  2. The private key in the credentials is incorrect\n"
                "  3. The credentials are for a different Firebase project\n"
                "  4. The service account key has been revoked\n"
                "\nPlease verify your FIREBASE_ADMIN_CREDENTIALS or FIREBASE_ADMIN_CREDENTIALS_PATH."
            ) from e

    _db = firestore.client()
    return _db


def save_account_data(
    account_id: str,
    account_name: Optional[str],
    summary_stats: Dict[str, Any],
    trades_by_symbol: Dict[str, Any],
    forex_data: Dict[str, Any],
) -> None:
    """Persist processed account data to Firestore."""
    db = get_db()
    doc_ref = db.collection("accounts").document(str(account_id))

    doc_ref.set(
        {
            "id": str(account_id),
            "name": account_name or f"Account {account_id}",
            "last_processed": summary_stats.get("last_updated"),
            "updated_at": firestore.SERVER_TIMESTAMP,
        },
        merge=True,
    )

    doc_ref.collection("summary").document("latest").set(summary_stats)
    doc_ref.collection("trades").document("byPair").set(trades_by_symbol)
    doc_ref.collection("forex").document("byPair").set(forex_data)


def get_account_status(account_id: str) -> Dict[str, Any]:
    """Fetch metadata for a single account."""
    db = get_db()
    snapshot = db.collection("accounts").document(str(account_id)).get()
    if not snapshot.exists:
        return {}
    data = snapshot.to_dict() or {}
    data["id"] = snapshot.id
    return data


def get_accounts_status(account_ids: List[str]) -> Dict[str, Dict[str, Any]]:
    """Fetch metadata for multiple accounts."""
    statuses: Dict[str, Dict[str, Any]] = {}
    db = get_db()
    for account_id in account_ids:
        doc = db.collection("accounts").document(str(account_id)).get()
        if doc.exists:
            data = doc.to_dict() or {}
            data["id"] = doc.id
            statuses[doc.id] = data
    return statuses


def get_account_data(account_id: str) -> Dict[str, Any]:
    """Return summary, trades, and forex data for an account."""
    db = get_db()
    doc_ref = db.collection("accounts").document(str(account_id))
    summary = doc_ref.collection("summary").document("latest").get()
    trades = doc_ref.collection("trades").document("byPair").get()
    forex = doc_ref.collection("forex").document("byPair").get()

    return {
        "account": doc_ref.get().to_dict() if doc_ref.get().exists else {},
        "summary": summary.to_dict() if summary.exists else {},
        "trades": trades.to_dict() if trades.exists else {},
        "forex": forex.to_dict() if forex.exists else {},
    }


def get_accounts_with_data() -> List[Dict[str, Any]]:
    """Return all accounts that have processed data (check by summary collection existence)."""
    db = get_db()
    all_accounts = db.collection("accounts").stream()
    accounts: List[Dict[str, Any]] = []
    for snap in all_accounts:
        # Check if summary collection exists
        summary_doc = snap.reference.collection("summary").document("latest").get()
        if summary_doc.exists:
            data = snap.to_dict() or {}
            data["id"] = snap.id
            accounts.append(data)
    return accounts


def get_trade_by_id(trade_id: str) -> Optional[Dict[str, Any]]:
    """Locate a trade across all accounts."""
    db = get_db()
    all_accounts = db.collection("accounts").stream()
    for account in all_accounts:
        # Check if account has data by looking for summary
        summary_doc = account.reference.collection("summary").document("latest").get()
        if not summary_doc.exists:
            continue
        trades_doc = (
            account.reference.collection("trades").document("byPair").get()
        )
        trades_data = trades_doc.to_dict() if trades_doc.exists else {}
        for trades in (trades_data or {}).values():
            if not isinstance(trades, list):
                continue
            for trade in trades:
                if str(trade.get("Trade ID")) == str(trade_id):
                    return trade
    return None


def get_recent_trades(limit: int = 40) -> List[Dict[str, Any]]:
    """Return a flattened list of recent trades for display."""
    db = get_db()
    all_accounts = db.collection("accounts").stream()
    all_trades: List[Dict[str, Any]] = []
    for account in all_accounts:
        # Check if account has data by looking for summary
        summary_doc = account.reference.collection("summary").document("latest").get()
        if not summary_doc.exists:
            continue
        trades_doc = (
            account.reference.collection("trades").document("byPair").get()
        )
        trades_data = trades_doc.to_dict() if trades_doc.exists else {}
        for pair, trades in (trades_data or {}).items():
            if not isinstance(trades, list):
                continue
            for trade in trades:
                all_trades.append(
                    {
                        **trade,
                        "pair": trade.get("pair") or pair.replace("_", "/"),
                    }
                )
    all_trades.sort(
        key=lambda t: t.get("Entry DateTime") or "", reverse=True
    )
    return all_trades[:limit]


def get_cached_trade_candles(trade_id: str, timeframe: str) -> Optional[List[Dict[str, Any]]]:
    db = get_db()
    doc_id = f"{trade_id}_{timeframe}"
    snapshot = db.collection("trade_candles").document(doc_id).get()
    if not snapshot.exists:
        return None
    data = snapshot.to_dict() or {}
    return data.get("candles")


def cache_trade_candles(trade_id: str, timeframe: str, candles: List[Dict[str, Any]]) -> None:
    db = get_db()
    doc_id = f"{trade_id}_{timeframe}"
    db.collection("trade_candles").document(doc_id).set(
        {
            "trade_id": str(trade_id),
            "timeframe": timeframe,
            "candles": candles,
            "updated_at": firestore.SERVER_TIMESTAMP,
        }
    )


def send_push_notification(token: str, title: str, body: str, data: Optional[Dict[str, Any]] = None) -> None:
    """Sends a push notification to a specific device token."""
    from firebase_admin import messaging

    # Create message with both notification and data payload
    # This ensures notifications work in both foreground and background
    message = messaging.Message(
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        data=data or {},  # Data payload for custom handling
        token=token,
        webpush=messaging.WebpushConfig(
            notification=messaging.WebpushNotification(
                title=title,
                body=body,
                icon='/icon-192x192.png',
                badge='/icon-96x96.png',
            )
        )
    )

    try:
        response = messaging.send(message)
        print(f"✅ Successfully sent message: {response}")
        print(f"   Title: {title}")
        print(f"   Body: {body}")
        print(f"   Token: {token[:20]}...")
    except Exception as e:
        print(f"❌ Error sending message: {e}")
        raise


def save_device_token(token: str) -> None:
    """Saves a device token to Firestore."""
    db = get_db()
    doc_ref = db.collection("device_tokens").document(token)
    doc_ref.set({"token": token, "updated_at": firestore.SERVER_TIMESTAMP})
    print(f"Device token {token} saved/updated in Firestore.")
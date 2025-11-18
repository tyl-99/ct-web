#!/usr/bin/env python3
"""
Development file watcher for auto-reloading trading data
Watches Python files and automatically runs data_processor.py when changes are detected
"""

import os
import sys
import time
import subprocess
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class TradingDataHandler(FileSystemEventHandler):
    def __init__(self):
        self.last_modified = {}
        self.cooldown = 2  # seconds between updates
        
    def on_modified(self, event):
        if event.is_directory:
            return
            
        file_path = event.src_path
        
        # Only watch Python files
        if not file_path.endswith('.py'):
            return
            
        # Skip __pycache__ files
        if '__pycache__' in file_path:
            return
            
        current_time = time.time()
        
        # Cooldown to prevent multiple rapid triggers
        if file_path in self.last_modified:
            if current_time - self.last_modified[file_path] < self.cooldown:
                return
                
        self.last_modified[file_path] = current_time
        
        print(f"\n🔄 File changed: {Path(file_path).name}")
        print(f"⏰ {time.strftime('%H:%M:%S')} - Refreshing trading data...")
        
        try:
            # Run data processor using conda environment
            script_dir = Path(__file__).parent
            
            # Use conda run to execute in trader-env environment
            # This works even if conda isn't activated in the current shell
            if sys.platform == 'win32':
                # Windows: use conda run
                result = subprocess.run(
                    ['conda', 'run', '-n', 'trader-env', 'python', str(script_dir / 'data_processor.py')],
                    capture_output=True, text=True, cwd=str(script_dir), shell=True
                )
            else:
                # Unix-like: use conda run
                result = subprocess.run(
                    ['conda', 'run', '-n', 'trader-env', 'python', str(script_dir / 'data_processor.py')],
                    capture_output=True, text=True, cwd=str(script_dir)
                )
            
            if result.returncode == 0:
                print("✅ Trading data updated successfully!")
                print(f"📊 Next.js will auto-reload with new data")
            else:
                print("❌ Error updating trading data:")
                print(result.stderr)
                
        except Exception as e:
            print(f"❌ Error running data processor: {e}")

def main():
    print("🚀 Starting Trading Data File Watcher...")
    print("📁 Watching for Python file changes in current directory")
    print("⚡ Auto-reload enabled for data_processor.py")
    print("🔥 Next.js hot reload handles frontend changes")
    print("⏹️  Press Ctrl+C to stop\n")
    
    # Watch current directory
    watch_path = "."
    
    event_handler = TradingDataHandler()
    observer = Observer()
    observer.schedule(event_handler, watch_path, recursive=True)
    
    try:
        observer.start()
        
        # Also run periodic updates every 10 minutes
        last_periodic = time.time()
        periodic_interval = 600  # 10 minutes
        
        while True:
            current_time = time.time()
            
            # Periodic update
            if current_time - last_periodic > periodic_interval:
                print(f"\n⏰ {time.strftime('%H:%M:%S')} - Periodic data refresh...")
                
                try:
                    script_dir = Path(__file__).parent
                    
                    # Use conda run to execute in trader-env environment
                    if sys.platform == 'win32':
                        # Windows: use conda run
                        result = subprocess.run(
                            ['conda', 'run', '-n', 'trader-env', 'python', str(script_dir / 'data_processor.py')],
                            capture_output=True, text=True, cwd=str(script_dir), shell=True
                        )
                    else:
                        # Unix-like: use conda run
                        result = subprocess.run(
                            ['conda', 'run', '-n', 'trader-env', 'python', str(script_dir / 'data_processor.py')],
                            capture_output=True, text=True, cwd=str(script_dir)
                        )
                    
                    if result.returncode == 0:
                        print("✅ Periodic update completed!")
                    else:
                        print("❌ Periodic update failed")
                        
                except Exception as e:
                    print(f"❌ Periodic update error: {e}")
                    
                last_periodic = current_time
            
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\n⏹️  Stopping file watcher...")
        observer.stop()
        
    observer.join()

if __name__ == "__main__":
    try:
        main()
    except ImportError:
        print("❌ Error: 'watchdog' package not found")
        print("📦 Install it with: pip install watchdog")
        print("💡 Or use the simple batch script option instead")
        sys.exit(1)

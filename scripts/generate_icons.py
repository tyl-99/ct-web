import os
from PIL import Image
from pathlib import Path

def generate_icons():
    # Source image
    source_path = Path("frontend/logofx.jpg")
    
    if not source_path.exists():
        print(f"[Error] Source image not found: {source_path}")
        return

    print(f"[Info] Found source image: {source_path}")
    
    # Output directory
    output_dir = Path("frontend/public")
    
    # Icon sizes to generate
    sizes = [72, 96, 128, 144, 152, 192, 384, 512]
    
    try:
        # Open source image
        with Image.open(source_path) as img:
            # Convert to RGB (in case it's CMYK or has alpha issues, though JPG usually doesn't)
            if img.mode != 'RGB':
                img = img.convert('RGB')
                
            # Generate PNGs
            for size in sizes:
                filename = f"icon-{size}x{size}.png"
                output_path = output_dir / filename
                
                # Resize with high quality (LANCZOS)
                resized_img = img.resize((size, size), Image.Resampling.LANCZOS)
                
                # Save as PNG
                resized_img.save(output_path, format="PNG")
                print(f"   Generated {filename}")
            
            # Generate standard favicon.ico (multi-size)
            # Typically 16x16, 32x32, 48x48
            icon_sizes = [(16, 16), (32, 32), (48, 48)]
            output_path = output_dir / "favicon.ico"
            img.save(output_path, format="ICO", sizes=icon_sizes)
            print(f"   Generated favicon.ico")
            
            print("\n[Success] All icons generated successfully!")
            print("NOTE: You may need to manually convert 'icon.svg' if you want a vector version,")
            print("      or simply delete it so the browser falls back to PNGs/ICO.")
            
    except Exception as e:
        print(f"[Error] generating icons: {e}")

if __name__ == "__main__":
    generate_icons()


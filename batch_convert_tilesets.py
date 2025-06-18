#!/usr/bin/env python3
"""
Batch SVG Converter - Converts all SVG files in tilesets folder to glowing border format
Usage: python batch_convert_tilesets.py
"""

import os
import sys
import subprocess
from pathlib import Path

def find_svg_files(directory):
    """Recursively find all SVG files in directory"""
    svg_files = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.svg'):
                svg_files.append(os.path.join(root, file))
    return svg_files

def convert_file(input_file):
    """Convert a single SVG file using svg_converter.py"""
    print(f"Converting: {input_file}")
    
    # Create temporary output file
    temp_file = input_file + '.temp'
    
    try:
        # Run the converter
        result = subprocess.run([
            'python', 'svg_converter.py', 
            input_file, temp_file
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            # Success - replace original with converted version
            os.replace(temp_file, input_file)
            print(f"✅ Successfully converted: {input_file}")
            return True
        else:
            print(f"❌ Failed to convert {input_file}: {result.stderr}")
            # Clean up temp file if it exists
            if os.path.exists(temp_file):
                os.remove(temp_file)
            return False
            
    except Exception as e:
        print(f"❌ Error processing {input_file}: {str(e)}")
        # Clean up temp file if it exists
        if os.path.exists(temp_file):
            os.remove(temp_file)
        return False

def main():
    tilesets_dir = "static/tilesets"
    
    if not os.path.exists(tilesets_dir):
        print(f"Error: Directory {tilesets_dir} not found")
        sys.exit(1)
    
    if not os.path.exists("svg_converter.py"):
        print("Error: svg_converter.py not found in current directory")
        sys.exit(1)
    
    print(f"Finding SVG files in {tilesets_dir}...")
    svg_files = find_svg_files(tilesets_dir)
    
    if not svg_files:
        print("No SVG files found")
        sys.exit(0)
    
    print(f"Found {len(svg_files)} SVG files")
    print("Starting batch conversion...")
    print("=" * 50)
    
    successful = 0
    failed = 0
    
    for svg_file in svg_files:
        if convert_file(svg_file):
            successful += 1
        else:
            failed += 1
    
    print("=" * 50)
    print(f"Conversion complete!")
    print(f"✅ Successfully converted: {successful} files")
    print(f"❌ Failed to convert: {failed} files")
    
    if failed > 0:
        sys.exit(1)
    else:
        print("🎉 All files converted successfully!")
        sys.exit(0)

if __name__ == "__main__":
    main() 
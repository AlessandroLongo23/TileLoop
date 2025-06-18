#!/usr/bin/env python3
"""
SVG Cleanup - Removes bgGradient and tiny/huge blur components from SVG files
Usage: python svg_cleanup.py
"""

import os
import sys
import re
from pathlib import Path

def clean_svg_content(svg_content):
    """Remove bgGradient and tiny/huge blur components from SVG content"""
    
    # Remove the radialGradient with id="bgGradient"
    svg_content = re.sub(
        r'<radialGradient[^>]*id="bgGradient"[^>]*>.*?</radialGradient>',
        '',
        svg_content,
        flags=re.DOTALL
    )
    
    # Remove the tinyBlur feGaussianBlur
    svg_content = re.sub(
        r'<feGaussianBlur[^>]*result="tinyBlur"[^>]*/>',
        '',
        svg_content
    )
    
    # Remove the hugeBlur feGaussianBlur  
    svg_content = re.sub(
        r'<feGaussianBlur[^>]*result="hugeBlur"[^>]*/>',
        '',
        svg_content
    )
    
    # Remove the tinyBlur feMergeNode
    svg_content = re.sub(
        r'<feMergeNode[^>]*in="tinyBlur"[^>]*/>',
        '',
        svg_content
    )
    
    # Remove the hugeBlur feMergeNode
    svg_content = re.sub(
        r'<feMergeNode[^>]*in="hugeBlur"[^>]*/>',
        '',
        svg_content
    )
    
    # Clean up any extra whitespace and empty lines
    lines = svg_content.split('\n')
    cleaned_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped:  # Only keep non-empty lines
            cleaned_lines.append(line)
    
    return '\n'.join(cleaned_lines)

def find_svg_files(directory):
    """Recursively find all SVG files in directory"""
    svg_files = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.svg'):
                svg_files.append(os.path.join(root, file))
    return svg_files

def clean_svg_file(file_path):
    """Clean a single SVG file"""
    try:
        # Read the original file
        with open(file_path, 'r', encoding='utf-8') as f:
            original_content = f.read()
        
        # Clean the content
        cleaned_content = clean_svg_content(original_content)
        
        # Only write if content changed
        if cleaned_content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(cleaned_content)
            print(f"✅ Cleaned: {file_path}")
            return True
        else:
            print(f"⚪ No changes needed: {file_path}")
            return True
            
    except Exception as e:
        print(f"❌ Error cleaning {file_path}: {str(e)}")
        return False

def main():
    tilesets_dir = "static/tilesets"
    
    if not os.path.exists(tilesets_dir):
        print(f"Error: Directory {tilesets_dir} not found")
        sys.exit(1)
    
    print(f"Finding SVG files in {tilesets_dir}...")
    svg_files = find_svg_files(tilesets_dir)
    
    if not svg_files:
        print("No SVG files found")
        sys.exit(0)
    
    print(f"Found {len(svg_files)} SVG files")
    print("Starting cleanup...")
    print("=" * 50)
    
    successful = 0
    failed = 0
    
    for svg_file in svg_files:
        if clean_svg_file(svg_file):
            successful += 1
        else:
            failed += 1
    
    print("=" * 50)
    print(f"Cleanup complete!")
    print(f"✅ Successfully processed: {successful} files")
    print(f"❌ Failed to process: {failed} files")
    
    if failed > 0:
        sys.exit(1)
    else:
        print("🎉 All files processed successfully!")
        sys.exit(0)

if __name__ == "__main__":
    main() 
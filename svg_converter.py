#!/usr/bin/env python3
"""
SVG Converter - Converts simple SVG tiles to glowing border format
Usage: python svg_converter.py input.svg output.svg
"""

import sys
import re
from xml.etree import ElementTree as ET
from xml.dom import minidom

def extract_polygon_points(svg_content):
    """Extract polygon points from the SVG"""
    # Find the main polygon element
    polygon_match = re.search(r'<polygon[^>]*points="([^"]*)"', svg_content)
    if polygon_match:
        return polygon_match.group(1)
    return None

def extract_internal_elements(svg_content):
    """Extract all path, line, and other drawing elements from inside the clipped group"""
    # Find ALL content inside clipped groups
    clip_group_matches = re.findall(r'<g[^>]*clip-path="url\(#polygon-clip-\d+\)"[^>]*>(.*?)</g>', svg_content, re.DOTALL)
    
    internal_elements = []
    for match in clip_group_matches:
        content = match.strip()
        # Remove comments and clean up
        content = re.sub(r'<!--.*?-->', '', content, flags=re.DOTALL)
        # Remove any polygon borders (we only want paths, lines, circles, etc.)
        content = re.sub(r'<polygon[^>]*id="border-polygon"[^>]*/?>', '', content)
        # Only keep content that has actual drawing elements (not empty after border removal)
        if content.strip() and ('<path' in content or '<line' in content or '<circle' in content or '<rect' in content):
            internal_elements.append(content)
    
    # Combine all internal elements
    combined_content = '\n'.join(internal_elements)
    if combined_content.strip():
        # Convert to mask format - change stroke to white and fill to none  
        combined_content = re.sub(r'stroke="#[^"]*"', 'stroke="white"', combined_content)
        combined_content = re.sub(r'fill="[^"]*"', 'fill="none"', combined_content)
        return combined_content.strip()
    return ""

def detect_polygon_sides(points_str):
    """Detect number of sides from polygon points"""
    points = points_str.split()
    return len(points)

def create_glowing_svg(polygon_points, internal_elements, sides):
    """Create the new SVG format with glowing border and gradient mask"""
    
    svg_template = f'''<svg xmlns="http://www.w3.org/2000/svg" class="s-BgHh72J5KvB0" viewBox="0 0 600 600" width="600" height="600">
    <defs class="s-BgHh72J5KvB0">
        <clipPath id="polygon-clip-{sides}" class="s-BgHh72J5KvB0">
            <polygon class="s-BgHh72J5KvB0" points="{polygon_points}"/>
        </clipPath>
        <radialGradient id="bgGradient" cx="50%" cy="66%" r="50%">
            <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1"/>
            <stop offset="30%" style="stop-color:#ffffff;stop-opacity:1"/>
            <stop offset="100%" style="stop-color:#ffcccc;stop-opacity:1"/>
        </radialGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="tinyBlur"/>
            <feGaussianBlur stdDeviation="16" result="smallBlur"/>
            <feGaussianBlur stdDeviation="32" result="mediumBlur"/>
            <feGaussianBlur stdDeviation="64" result="largeBlur"/>
            <feGaussianBlur stdDeviation="128" result="hugeBlur"/>
            <feMerge>
                <feMergeNode in="hugeBlur"/>
                <feMergeNode in="largeBlur"/>
                <feMergeNode in="mediumBlur"/>
                <feMergeNode in="smallBlur"/>
                <feMergeNode in="tinyBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        </filter>
        <radialGradient id="redGradient" cx="50%" cy="50%" r="100%">
            <stop id="gradientStop1" offset="7%" style="stop-color:#1e293b;stop-opacity:1"/>
            <stop id="gradientStop2" offset="20%" style="stop-color:#1e293b;stop-opacity:1"/>
        </radialGradient>
        <mask id="pathMask">
            <rect width="100%" height="100%" fill="black"/>
            {internal_elements}
        </mask>
    </defs>

    <polygon fill="white" id="base-polygon" stroke="none" class="s-BgHh72J5KvB0" points="{polygon_points}"/>
    
    <g clip-path="url(#polygon-clip-{sides})" class="s-BgHh72J5KvB0">
        <polygon id="border-polygon" fill="none" stroke="#ff0000" stroke-width="0" filter="url(#glow)" class="s-BgHh72J5KvB0" points="{polygon_points}"/>
    </g>

    <g clip-path="url(#polygon-clip-{sides})" class="s-BgHh72J5KvB0">
        <rect width="100%" height="100%" fill="url(#redGradient)" mask="url(#pathMask)" class="s-BgHh72J5KvB0"/>
    </g>
</svg>'''
    
    return svg_template

def convert_svg(input_file, output_file):
    """Convert SVG from simple format to glowing border format"""
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            svg_content = f.read()
        
        # Extract polygon points
        polygon_points = extract_polygon_points(svg_content)
        if not polygon_points:
            print(f"Error: Could not find polygon points in {input_file}")
            return False
        
        # Extract internal drawing elements
        internal_elements = extract_internal_elements(svg_content)
        
        # Detect number of sides
        sides = detect_polygon_sides(polygon_points)
        
        # Create new SVG
        new_svg = create_glowing_svg(polygon_points, internal_elements, sides)
        
        # Pretty format the SVG
        try:
            dom = minidom.parseString(new_svg)
            pretty_svg = dom.toprettyxml(indent="    ", encoding=None)
            # Remove empty lines and fix formatting
            lines = [line for line in pretty_svg.split('\n') if line.strip()]
            pretty_svg = '\n'.join(lines[1:])  # Remove XML declaration
        except:
            pretty_svg = new_svg
        
        # Write output
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(pretty_svg)
        
        print(f"Successfully converted {input_file} to {output_file}")
        print(f"Detected {sides}-sided polygon")
        return True
        
    except Exception as e:
        print(f"Error converting {input_file}: {str(e)}")
        return False

def main():
    if len(sys.argv) != 3:
        print("Usage: python svg_converter.py input.svg output.svg")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    if convert_svg(input_file, output_file):
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main() 
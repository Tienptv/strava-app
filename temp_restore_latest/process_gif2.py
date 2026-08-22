from PIL import Image

def process_gif(input_path, output_path, bg_tol=40):
    img = Image.open(input_path)
    
    frames = []
    try:
        bg_color = None
        
        while True:
            frame = img.convert("RGBA")
            if bg_color is None:
                bg_color = frame.getpixel((0,0))
                
            data = frame.getdata()
            new_data = []
            
            br, bg, bb, ba = bg_color
            
            for item in data:
                r, g, b, a = item
                
                # Check distance from bg_color to make transparent
                if abs(r - br) < bg_tol and abs(g - bg) < bg_tol and abs(b - bb) < bg_tol:
                    new_data.append((255, 255, 255, 0))
                
                # Check for green shirt (g > r and g > b)
                elif g > r + 20 and g > b + 20 and g > 60:
                    # Map to Haskoning Orange (242, 103, 36)
                    factor = g / 255.0
                    # Enhance brightness slightly to make it pop
                    new_data.append((min(255, int(255 * factor)), int(120 * factor), int(40 * factor), a))
                    
                # Check for blue pants (b > r + 30 and b > g + 10 and b > 50)
                elif b > r + 30 and b > g + 10 and b > 50:
                    # Map to Haskoning Orange
                    factor = b / 255.0
                    new_data.append((min(255, int(255 * factor)), int(120 * factor), int(40 * factor), a))
                else:
                    new_data.append(item)
                        
            frame.putdata(new_data)
            frames.append(frame)
            
            img.seek(img.tell() + 1)
    except EOFError:
        pass
        
    if frames:
        duration = img.info.get('duration', 100)
        frames[0].save(output_path, save_all=True, append_images=frames[1:], loop=0, duration=duration, disposal=2)

process_gif(r'c:\TIEN.PHAMTV\Script\strava-app-20260817T015557Z-1-001\strava-app\public\icegif-449.gif', r'c:\TIEN.PHAMTV\Script\strava-app-20260817T015557Z-1-001\strava-app\public\icegif-449-transparent.gif')

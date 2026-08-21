from PIL import Image

def remove_green_background(input_path, output_path, tolerance=60):
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
                
                # Check distance from bg_color
                if abs(r - br) < tolerance and abs(g - bg) < tolerance and abs(b - bb) < tolerance:
                    new_data.append((255, 255, 255, 0))
                # Fallback heuristic for typical bright green screen
                elif g > 150 and r < g - 50 and b < g - 50:
                    new_data.append((255, 255, 255, 0))
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

remove_green_background(r'c:\TIEN.PHAMTV\Script\strava-app-20260817T015557Z-1-001\strava-app\public\icegif-449.gif', r'c:\TIEN.PHAMTV\Script\strava-app-20260817T015557Z-1-001\strava-app\public\icegif-449-transparent.gif')

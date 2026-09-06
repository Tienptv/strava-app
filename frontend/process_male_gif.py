from PIL import Image

def process_male_gif(input_path, output_path, bg_tol=40):
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
            
            width, height = frame.size
            
            x = 0
            y = 0
            
            for item in data:
                r, g, b, a = item
                
                # Check distance from bg_color to make transparent
                if abs(r - br) < bg_tol and abs(g - bg) < bg_tol and abs(b - bb) < bg_tol:
                    new_data.append((255, 255, 255, 0))
                else:
                    # Check for brown hair to remove ponytail (left side of head)
                    is_brown = (r < 120 and g < 60 and b < 40 and r > 40)
                    if is_brown and x < 350:
                        new_data.append((255, 255, 255, 0))
                    # Check for green pants (make them gray)
                    elif g > r + 20 and g > b + 20 and g > 60 and r < 150:
                        gray = int(r * 0.3 + g * 0.59 + b * 0.11)
                        new_data.append((gray, gray, gray, a))
                    # Check for teal top (make it dark blue)
                    elif b > r + 30 and b > g + 10 and b > 50:
                        new_data.append((int(r*0.5), int(g*0.5), min(255, int(b*1.2)), a))
                    else:
                        new_data.append(item)
                
                x += 1
                if x >= width:
                    x = 0
                    y += 1
                        
            frame.putdata(new_data)
            frames.append(frame)
            
            img.seek(img.tell() + 1)
    except EOFError:
        pass
        
    if frames:
        duration = img.info.get('duration', 100)
        frames[0].save(output_path, save_all=True, append_images=frames[1:], loop=0, duration=duration, disposal=2)

if __name__ == "__main__":
    process_male_gif(r'c:\TIEN.PHAMTV\Script\strava-app-20260817T015557Z-1-001\strava-app\public\icegif-449.gif', r'c:\TIEN.PHAMTV\Script\strava-app-20260817T015557Z-1-001\strava-app\public\male-runner.gif')

from PIL import Image

def is_background(r, g, b):
    # Check if pixel is light gray/white (fake checkerboard)
    # The star colors are highly saturated teal and lime green.
    # Gray/white pixels will have r, g, b values close to each other and be relatively bright.
    if r > 180 and g > 180 and b > 180:
        return True
    return False

img = Image.open(r"c:\TIEN.PHAMTV\Script\strava-app-20260817T015557Z-1-001\strava-app\public\haskoning-star.png")
img = img.convert("RGBA")
datas = img.getdata()

newData = []
for item in datas:
    if is_background(item[0], item[1], item[2]):
        newData.append((255, 255, 255, 0)) # transparent
    else:
        newData.append(item)

img.putdata(newData)

# Find bounding box of non-transparent pixels to crop out extra space
bbox = img.getbbox()
if bbox:
    img = img.crop(bbox)

img.save(r"c:\TIEN.PHAMTV\Script\strava-app-20260817T015557Z-1-001\strava-app\public\haskoning-star-transparent.png")
print("Saved transparent and cropped image")

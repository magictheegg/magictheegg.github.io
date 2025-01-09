# thanks Epid!

import os
import json
from PIL import Image

# run from the same directory as the .config file
# requires: pip install pillow
# view README.md for more information

def load_config(json_path):
    with open(json_path, 'r') as f:
        return json.load(f)

def process_image(img_path, corner_positions, corner_radius=17):
    try:
        img = Image.open(img_path).convert("RGBA")

        width, height = img.size
        pixels = img.load()

        for corner, (cx, cy) in corner_positions.items():
            if cx >= width or cy >= height:
                print(f"Skipping {img_path}: Corner position {corner} is out of bounds.")
                return

        apply_black_coating = {}
        for corner, (cx, cy) in corner_positions.items():
            r, g, b, _ = pixels[cx, cy]
            apply_black_coating[corner] = (r == 0 and g == 0 and b == 0)

        new_img = Image.new("RGBA", (width, height))
        new_pixels = new_img.load()

        for y in range(height):
            for x in range(width):
                r, g, b, a = pixels[x, y]
                dr, dg, db, _ = pixels[x, y]
                brightness = (dr + dg + db) // 3

                if x < corner_radius and y < corner_radius:
                    distance = max(x, y)
                    corner_key = "top_left"
                elif x >= width - corner_radius and y < corner_radius:
                    distance = max(width - x - 1, y)
                    corner_key = "top_right"
                elif x < corner_radius and y >= height - corner_radius:
                    distance = max(x, height - y - 1)
                    corner_key = "bottom_left"
                elif x >= width - corner_radius and y >= height - corner_radius:
                    distance = max(width - x - 1, height - y - 1)
                    corner_key = "bottom_right"
                else:
                    distance = None
                    corner_key = None

                if distance is not None and distance < corner_radius:
                    transparency = int((brightness / 255) * 255)
                    if apply_black_coating.get(corner_key, False):
                        new_pixels[x, y] = (0, 0, 0, 255 - transparency)
                    else:
                        new_pixels[x, y] = (r, g, b, 255 - transparency)
                else:
                    new_pixels[x, y] = pixels[x, y]

        new_img.save(img_path, "PNG")

    except Exception as e:
        print(f"Error processing {img_path}: {e}")

def batch_process_images(setCode):
    # load configuration
    config_path = "./scripts/config.json" 
    config = load_config(config_path)

    input_dir = os.path.join('sets', setCode + '-files', 'img')
    script_dir = os.path.dirname(__file__)
    corner_positions = config["corner_positions"]
    corner_radius = config["corner_radius"]

    for file_name in os.listdir(input_dir):
        if file_name.endswith(".png"):
            img_path = os.path.join(input_dir, file_name)

            print(f"Processing {file_name}...")
            process_image(img_path, corner_positions, corner_radius)

    print("Batch processing complete.")
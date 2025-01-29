# thanks Epid! (for v1.0)

import os
import json
from PIL import Image

def process_image(img_path, img_type):
    img = Image.open(img_path).convert("RGBA")

    width, height = img.size
    pixels = img.load()

    new_img = Image.new("RGBA", (width, height))
    new_pixels = new_img.load()
    pixels_to_chop = [ 13, 10, 8, 7, 6, 5, 4, 3, 2, 2, 1, 1, 1 ]

    width, height = img.size

    for y in range(height):
        for x in range(width):
            if y >= len(pixels_to_chop):
                if y < height - len(pixels_to_chop):
                    new_pixels[x, y] = pixels[x, y]
                elif x >= pixels_to_chop[height - y - 1] and x < width - pixels_to_chop[height - y - 1]:
                    new_pixels[x, y] = pixels[x, y]
            elif x >= pixels_to_chop[y] and x < width - pixels_to_chop[y]:
                new_pixels[x, y] = pixels[x, y]

    new_img.save(img_path, img_type)

def batch_process_images(setCode):
    input_dir = os.path.join('sets', setCode + '-files', 'img')

    for file_name in os.listdir(input_dir):
        if file_name.endswith(".png") or file_name.endswith(".jpg"):
            img_type = file_name[-3:]
            img_path = os.path.join(input_dir, file_name)
            print(f"Processing {file_name}...")
            process_image(img_path, img_type)

    print("Batch processing of " + setCode + " images complete.")
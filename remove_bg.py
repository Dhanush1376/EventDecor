import os
from rembg import remove
from PIL import Image

input_path = 'frontend/public/logo.png'
output_path = 'frontend/public/logo-nobg.png'

# Make sure input file exists
if not os.path.exists(input_path):
    print(f"Error: Could not find {input_path}")
    exit(1)

print(f"Processing {input_path}...")

# Read the image
input_image = Image.open(input_path)

# Remove the background
output_image = remove(input_image)

# Save the result
output_image.save(output_path)
print(f"Saved background-free image to {output_path}")

import os, struct, zlib

def create_png(width, height, filepath):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    # Background color #2b133d (43, 19, 61), Accent #d199ff (209, 153, 255)
    raw_data = bytearray()
    center_x, center_y = width / 2.0, height / 2.0
    r_outer = width * 0.40
    r_inner = width * 0.32

    for y in range(height):
        raw_data.append(0) # Filter type 0 (None)
        for x in range(width):
            dx, dy = x - center_x, y - center_y
            dist = (dx*dx + dy*dy) ** 0.5
            if r_inner <= dist <= r_outer:
                raw_data.extend([209, 153, 255, 255]) # Accent ring
            elif dist < r_inner:
                raw_data.extend([55, 25, 75, 255]) # Inner circle
            else:
                raw_data.extend([43, 19, 61, 255]) # Dark purple bg

    # PNG chunks
    header = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>I', 13) + b'IHDR' + struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr += struct.pack('>I', zlib.crc32(ihdr[4:]))

    compressed = zlib.compress(bytes(raw_data), 9)
    idat = struct.pack('>I', len(compressed)) + b'IDAT' + compressed
    idat += struct.pack('>I', zlib.crc32(idat[4:]))

    iend = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', zlib.crc32(b'IEND'))

    with open(filepath, 'wb') as f:
        f.write(header + ihdr + idat + iend)

create_png(192, 192, 'static/icons/icon-192.png')
create_png(512, 512, 'static/icons/icon-512.png')
print("Generated static/icons/icon-192.png and icon-512.png")

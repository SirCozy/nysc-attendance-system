import qrcode
import os

# create folder if not exists
os.makedirs("qr_codes", exist_ok=True)

for i in range(1, 101):
    data = f"NYSC-2026-CDS-{i:03d}"
    img = qrcode.make(data)
    img.save(f"qr_codes/{data}.png")

print("✅ QR codes generated in 'qr_codes' folder")
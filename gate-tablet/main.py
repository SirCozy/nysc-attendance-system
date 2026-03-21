import cv2
from pyzbar.pyzbar import decode
from storage import assign_number

cap = cv2.VideoCapture(0)

print("Gate Scanner Running...")

scanned = set()

while True:

    ret, frame = cap.read()

    if not ret:
        continue

    for barcode in decode(frame):

        qr_data = barcode.data.decode("utf-8")

        # 1️⃣ Prevent duplicate scans (same session)
        if qr_data in scanned:
            continue

        # 2️⃣ Validate QR format
        if not qr_data.startswith("NYSC-2026-CDS"):
            print("❌ Invalid QR")
            continue

        scanned.add(qr_data)

        number = assign_number(qr_data)

        print(f"✅ Assigned Number: {number}")

    cv2.imshow("Gate Scanner", frame)

    if cv2.waitKey(1) == 27:
        break

cap.release()
cv2.destroyAllWindows()
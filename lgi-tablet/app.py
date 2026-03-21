from flask import Flask, render_template, request, jsonify
import json
import os

app = Flask(__name__)

# Attendance file for LGI marking
ATT_FILE = "attendance.json"

# Gate tablet data file
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_FILE = os.path.join(BASE_DIR, "gate-tablet", "local_storage.json")

def load_data():
    with open(DATA_FILE, "r") as f:
        return json.load(f)

def load_attendance():
    if not os.path.exists(ATT_FILE):
        # create if not exist
        with open(ATT_FILE, "w") as f:
            json.dump({"marked": []}, f, indent=4)
    with open(ATT_FILE, "r") as f:
        return json.load(f)

def save_attendance(data):
    with open(ATT_FILE, "w") as f:
        json.dump(data, f, indent=4)

@app.route("/")
def index():
    data = load_data()
    attendance = load_attendance()

    records = data["records"]
    marked = attendance["marked"]

    page = request.args.get("page", 1, type=int)
    per_page = 50

    start = (page - 1) * per_page
    end = start + per_page
    paginated_records = records[start:end]

    total_pages = (len(records) + per_page - 1) // per_page

    # Safe stats calculation: only count marked numbers that exist in records
    record_numbers = [r["number"] for r in records]
    present = len([m for m in marked if m in record_numbers])
    total = len(record_numbers)
    absent = total - present

    return render_template(
        "index.html",
        records=paginated_records,
        marked=marked,
        page=page,
        total_pages=total_pages,
        total=total,
        present=present,
        absent=absent
    )

@app.route("/mark", methods=["POST"])
def mark():
    number = int(request.json["number"])

    data = load_data()
    attendance = load_attendance()

    valid_numbers = [r["number"] for r in data["records"]]

    # Only mark valid numbers
    if number in valid_numbers and number not in attendance["marked"]:
        attendance["marked"].append(number)
        save_attendance(attendance)

    return jsonify({"status": "ok"})

@app.route("/export")
def export():
    attendance = load_attendance()
    with open("attendance_export.csv", "w") as f:
        f.write("number\n")
        for n in attendance["marked"]:
            f.write(f"{n}\n")
    return "Exported attendance_export.csv"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
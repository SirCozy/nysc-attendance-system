from flask import Flask, render_template, request, jsonify
import json
import os

app = Flask(__name__)

ATT_FILE = "attendance.json"

# path to gate data
GATE_FILE = "../gate-tablet/local_storage.json"


def load_attendance():
    with open(ATT_FILE, "r") as f:
        return json.load(f)


def save_attendance(data):
    with open(ATT_FILE, "w") as f:
        json.dump(data, f, indent=4)


def get_last_number():
    if os.path.exists(GATE_FILE):
        with open(GATE_FILE, "r") as f:
            data = json.load(f)
            return data["last_number"]
    return 0


@app.route("/")
def index():

    attendance = load_attendance()

    last_number = get_last_number()

    numbers = list(range(1, last_number + 1))

    return render_template(
        "index.html",
        numbers=numbers,
        marked=attendance["marked"]
    )


@app.route("/mark", methods=["POST"])
def mark():

    number = int(request.json["number"])

    data = load_attendance()

    if number not in data["marked"]:
        data["marked"].append(number)
        save_attendance(data)

    return jsonify({"status": "ok"})

@app.route("/export")
def export():

    attendance = load_attendance()

    with open("attendance_export.csv", "w") as f:

        f.write("number\n")

        for n in attendance["marked"]:
            f.write(f"{n}\n")

    return "Exported attendance_export.csv"

app.run(host="0.0.0.0", port=5000)
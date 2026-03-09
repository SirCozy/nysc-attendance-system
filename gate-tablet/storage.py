import json

FILE = "local_storage.json"

def load_data():
    with open(FILE, "r") as f:
        return json.load(f)

def save_data(data):
    with open(FILE, "w") as f:
        json.dump(data, f, indent=4)

def assign_number(qr_data):
    data = load_data()

    # prevent duplicates
    for record in data["records"]:
        if record["qr"] == qr_data:
            return record["number"]

    new_number = data["last_number"] + 1

    record = {
        "qr": qr_data,
        "number": new_number
    }

    data["records"].append(record)
    data["last_number"] = new_number

    save_data(data)

    return new_number
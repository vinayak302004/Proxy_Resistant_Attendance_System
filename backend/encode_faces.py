import face_recognition
import os
import pickle

DATASET_PATH = "dataset"

known_encodings = []
known_names = []

if not os.path.exists(DATASET_PATH):
    print("Dataset folder not found!")
    exit()

for person in os.listdir(DATASET_PATH):

    person_folder = os.path.join(DATASET_PATH, person)

    if not os.path.isdir(person_folder):
        continue

    print(f"Encoding {person}...")

    for image_name in os.listdir(person_folder):

        image_path = os.path.join(person_folder, image_name)

        # Ignore folders and non-image files
        if not os.path.isfile(image_path):
            continue

        if not image_name.lower().endswith((".jpg", ".jpeg", ".png")):
            continue

        image = face_recognition.load_image_file(image_path)

        boxes = face_recognition.face_locations(image)

        encodings = face_recognition.face_encodings(image, boxes)

        for encoding in encodings:
            known_encodings.append(encoding)
            known_names.append(person)

data = {
    "encodings": known_encodings,
    "names": known_names
}

with open("encodings.pickle", "wb") as f:
    pickle.dump(data, f)

print("--------------------------------")
print("Encoding Complete")
print(f"Total Faces: {len(known_encodings)}")
print("--------------------------------")
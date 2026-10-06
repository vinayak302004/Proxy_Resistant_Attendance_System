import face_recognition
import os
import pickle

DATASET_PATH = "dataset"
OUTPUT_FILE = "encodings.pickle"

IMAGE_EXTENSIONS = (
    ".jpg",
    ".jpeg",
    ".png",
    ".webp"
)
if not os.path.exists(DATASET_PATH):
    print("Dataset folder not found!")
    exit()
known_encodings = []
known_names = []
for person in sorted(os.listdir(DATASET_PATH)):
    person_folder = os.path.join(
        DATASET_PATH,
        person
    )
    if not os.path.isdir(person_folder):
        continue
    if person.lower() == "dataset":
        print("Skipping unwanted nested dataset folder...")
        continue
    print()
    print(f"Encoding {person}...")
    image_count = 0
    face_count = 0
    for image_name in sorted(os.listdir(person_folder)):
        image_path = os.path.join(
            person_folder,
            image_name
        )
        if not os.path.isfile(image_path):
            continue
        if not image_name.lower().endswith(
            IMAGE_EXTENSIONS
        ):
            continue
        image_count += 1
        try:
            print(
                f"   Processing: {image_name}"
            )
            image = face_recognition.load_image_file(
                image_path
            )
            boxes = face_recognition.face_locations(
                image
            )
            print(
                f"   Faces detected: {len(boxes)}"
            )
            if len(boxes) == 0:
                print(
                    f"   WARNING: No face detected in {image_name}"
                )
                continue
            if len(boxes) > 1:
                print(
                    f"   WARNING: Multiple faces detected in {image_name}"
                )
                continue
            encodings = face_recognition.face_encodings(
                image,
                boxes
            )
            if len(encodings) == 0:
                print(
                    f"   WARNING: Could not encode {image_name}"
                )
                continue
            known_encodings.append(
                encodings[0]
            )
            known_names.append(
                person
            )
            face_count += 1
            print(
                "   Encoding successful"
            )
        except Exception as e:
            print(
                f"   ERROR processing {image_name}: {e}"
            )
    print(
        f"   Images: {image_count} | "
        f"Valid faces: {face_count}"
    )
data = {
    "encodings":
        known_encodings,
    "names":
        known_names
}
with open(
    OUTPUT_FILE,
    "wb"
) as f:
    pickle.dump(
        data,
        f
    )
print()
print("--------------------------------")
print("Encoding Complete")
print(
    f"Total Faces: {len(known_encodings)}"
)
print(
    f"Total Students: {len(set(known_names))}"
)
print("--------------------------------")
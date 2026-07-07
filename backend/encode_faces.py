import face_recognition
import os
import pickle

dataset = "dataset"

knownEncodings = []
knownNames = []

for person in os.listdir(dataset):

    personFolder = os.path.join(dataset, person)

    for imageName in os.listdir(personFolder):

        imagePath = os.path.join(personFolder, imageName)

        image = face_recognition.load_image_file(imagePath)

        boxes = face_recognition.face_locations(image)

        encodings = face_recognition.face_encodings(image, boxes)

        for encoding in encodings:

            knownEncodings.append(encoding)

            knownNames.append(person)

data = {
    "encodings": knownEncodings,
    "names": knownNames
}

with open("encodings.pickle", "wb") as f:

    pickle.dump(data, f)

print("Encoding Complete")
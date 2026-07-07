from flask import Flask, request, jsonify
from flask_cors import CORS

import numpy as np
import cv2

from face_verify import verify_face

app = Flask(__name__)
CORS(app)


@app.route("/")
def home():
    return "Face Recognition Backend Running"


@app.route("/verify-face", methods=["POST"])
def verify():

    if "image" not in request.files:
        return jsonify({
            "verified": False,
            "message": "No image uploaded"
        })

    file = request.files["image"]

    image = np.frombuffer(file.read(), np.uint8)

    image = cv2.imdecode(image, cv2.IMREAD_COLOR)

    result = verify_face(image)

    return jsonify(result)


if __name__ == "__main__":
    app.run(
    host="0.0.0.0",
    port=5000,
    debug=True
    )
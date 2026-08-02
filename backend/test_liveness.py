import cv2
from liveness import check_liveness

cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("Cannot open camera")
    exit()

while True:

    ret, frame = cap.read()

    if not ret:
        break

    is_live = check_liveness(frame)

    if is_live:
        text = "LIVE"
        color = (0, 255, 0)
    else:
        text = "SPOOF"
        color = (0, 0, 255)

    cv2.putText(
        frame,
        text,
        (20, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        color,
        2
    )

    cv2.imshow("Liveness Test", frame)

    key = cv2.waitKey(1)

    if key == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()
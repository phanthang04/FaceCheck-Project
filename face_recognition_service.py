import face_recognition
import cv2
import numpy as np
import json
import sys
import os
import base64
from pathlib import Path

# Đảm bảo stdout/stderr dùng UTF-8 (fix lỗi 'charmap' trên Windows)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
    sys.stderr.reconfigure(encoding="utf-8", errors="backslashreplace")

# Redirect print to stderr để không ảnh hưởng JSON output
def print_debug(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)

# Thư mục chứa ảnh khuôn mặt của học sinh
KNOWN_FACES_DIR = "known_faces"

def load_known_faces():
    """
    Load tất cả ảnh khuôn mặt đã biết từ thư mục known_faces
    Format: known_faces/{student_id}_{student_name}.jpg
    """
    known_face_encodings = []
    known_face_names = []
    
    if not os.path.exists(KNOWN_FACES_DIR):
        os.makedirs(KNOWN_FACES_DIR)
        return known_face_encodings, known_face_names
    
    # Duyệt qua các folder trong known_faces
    for folder_name in os.listdir(KNOWN_FACES_DIR):
        folder_path = os.path.join(KNOWN_FACES_DIR, folder_name)
        
        # Chỉ xử lý các folder (bỏ qua file)
        if not os.path.isdir(folder_path):
            continue
        
        # Parse tên folder: {student_id}_{student_name}
        parts = folder_name.split('_', 1)
        if len(parts) >= 2:
            student_id = parts[0]
            student_name = parts[1]
        else:
            student_name = folder_name
            student_id = ""
        
        # Load tất cả ảnh trong folder
        for filename in os.listdir(folder_path):
            if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
                image_path = os.path.join(folder_path, filename)
                try:
                    # Load ảnh và encode
                    image = face_recognition.load_image_file(image_path)
                    encodings = face_recognition.face_encodings(image)
                    
                    if len(encodings) > 0:
                        known_face_encodings.append(encodings[0])
                        known_face_names.append(student_name)
                        print_debug(f"Loaded: {student_name} from {folder_name}/{filename}")
                except Exception as e:
                    print_debug(f"Error loading {folder_name}/{filename}: {str(e)}")
    
    return known_face_encodings, known_face_names

def recognize_face_from_base64(image_base64):
    """
    Nhận diện khuôn mặt từ ảnh base64
    """
    try:
        # Decode base64
        image_data = base64.b64decode(image_base64)
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            return {"success": False, "message": "Không thể decode ảnh"}
        
        # Convert BGR to RGB (face_recognition uses RGB)
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Tìm khuôn mặt trong ảnh
        face_locations = face_recognition.face_locations(rgb_image)
        face_encodings = face_recognition.face_encodings(rgb_image, face_locations)
        
        if len(face_encodings) == 0:
            return {"success": False, "message": "Không phát hiện được khuôn mặt"}
        
        # Load known faces
        known_face_encodings, known_face_names = load_known_faces()
        
        if len(known_face_encodings) == 0:
            return {"success": False, "message": "Chưa có dữ liệu khuôn mặt để so sánh"}
        
        recognized_names = []
        
        for face_encoding in face_encodings:
            # So sánh với các khuôn mặt đã biết
            matches = face_recognition.compare_faces(known_face_encodings, face_encoding, tolerance=0.6)
            face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
            
            # Tìm khuôn mặt khớp nhất
            best_match_index = np.argmin(face_distances)
            
            if matches[best_match_index] and face_distances[best_match_index] < 0.6:
                recognized_names.append(known_face_names[best_match_index])
            else:
                recognized_names.append("Unknown")
        
        return {
            "success": True,
            "names": recognized_names,
            "count": len(recognized_names)
        }
        
    except Exception as e:
        return {"success": False, "message": f"Lỗi: {str(e)}"}

def recognize_face_from_file(image_path):
    """
    Nhận diện khuôn mặt từ file ảnh
    """
    try:
        # Load ảnh
        image = face_recognition.load_image_file(image_path)
        
        # Tìm khuôn mặt trong ảnh
        face_locations = face_recognition.face_locations(image)
        face_encodings = face_recognition.face_encodings(image, face_locations)
        
        if len(face_encodings) == 0:
            return {"success": False, "message": "Không phát hiện được khuôn mặt"}
        
        # Load known faces
        known_face_encodings, known_face_names = load_known_faces()
        
        if len(known_face_encodings) == 0:
            return {"success": False, "message": "Chưa có dữ liệu khuôn mặt để so sánh"}
        
        recognized_names = []
        
        for face_encoding in face_encodings:
            # So sánh với các khuôn mặt đã biết
            matches = face_recognition.compare_faces(known_face_encodings, face_encoding, tolerance=0.6)
            face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
            
            # Tìm khuôn mặt khớp nhất
            best_match_index = np.argmin(face_distances)
            
            if matches[best_match_index] and face_distances[best_match_index] < 0.6:
                recognized_names.append(known_face_names[best_match_index])
            else:
                recognized_names.append("Unknown")
        
        return {
            "success": True,
            "names": recognized_names,
            "count": len(recognized_names)
        }
        
    except Exception as e:
        return {"success": False, "message": f"Lỗi: {str(e)}"}

if __name__ == "__main__":
    try:
        # Nhận input từ command line
        if len(sys.argv) < 2:
            print(json.dumps({"success": False, "message": "Thiếu tham số"}))
            sys.exit(1)
        
        input_type = sys.argv[1]
        
        if input_type == "base64":
            if len(sys.argv) < 3:
                print(json.dumps({"success": False, "message": "Thiếu dữ liệu ảnh base64"}))
                sys.exit(1)
            image_base64 = sys.argv[2]
            result = recognize_face_from_base64(image_base64)
            print(json.dumps(result, ensure_ascii=False))
        
        elif input_type == "file":
            if len(sys.argv) < 3:
                print(json.dumps({"success": False, "message": "Thiếu đường dẫn file"}))
                sys.exit(1)
            image_path = sys.argv[2]
            
            # Kiểm tra file có tồn tại không
            if not os.path.exists(image_path):
                print(json.dumps({"success": False, "message": f"File không tồn tại: {image_path}"}))
                sys.exit(1)
            
            result = recognize_face_from_file(image_path)
            print(json.dumps(result, ensure_ascii=False))
        
        else:
            print(json.dumps({"success": False, "message": "Loại input không hợp lệ"}))
            sys.exit(1)
            
    except Exception as e:
        error_msg = f"Lỗi không mong đợi: {str(e)}"
        print_debug(error_msg)
        print(json.dumps({"success": False, "message": error_msg}))
        sys.exit(1)


# FaceAttend – Face Recognition Attendance System

FaceAttend is an intelligent attendance tracking solution that utilizes facial recognition technology. It streamlines the attendance process for educational institutions and organizations by providing a seamless, secure, and automated way to record presence.

---

## 🚀 Key Features

- **Facial Recognition**: High-accuracy student identification using `dlib` and `face-recognition` libraries.
- **Face Registration**: Easy onboarding of students by capturing and encoding their facial data.
- **Real-time Monitoring**: A web-based dashboard for administrators and teachers to view attendance records.
- **Secure Management**: Role-based access control and secure user authentication.
- **Automated Logging**: Automatic attendance status updates in the database upon successful recognition.

---

## 🛠️ Tech Stack

### Backend

- **Node.js & Express**: Core server and API management.
- **Sequelize**: ORM for database interactions (SQLite/MySQL).
- **EJS**: Server-side template engine for dynamic web pages.
- **Multer**: Handling file uploads for face registration.

### AI Service

- **Python 3.x**: Processing logic for facial recognition.
- **face-recognition**: Python library for face detection and encoding.
- **OpenCV**: Image processing and computer vision tasks.
- **dlib**: Underlying C++ toolkit for machine learning and face processing.

---

## 📂 Project Structure

```text
FaceCheck-Project/
├── src/
│   ├── config/          # Database configuration
│   ├── models/          # Sequelize models
│   ├── routes/          # Express route definitions
│   ├── views/           # EJS templates for the UI
│   └── modules/         # Business logic and controllers
├── known_faces/         # Registered facial data (encoded)
├── uploads/             # Temporary storage for uploaded images
├── face_recognition_service.py # Python service for AI processing
├── server.js            # Main entry point (Node.js)
├── package.json         # Node.js dependencies and scripts
└── requirements.txt      # Python dependencies
```

---

## ⚙️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/phanthang04/FaceCheck-Project.git
cd FaceCheck-Project
```

### 2. Backend Setup (Node.js)

```bash
npm install
```

_Note: Make sure you have Node.js (v16+) installed._

### 3. AI Service Setup (Python)

It is recommended to use a virtual environment:

```bash
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
```

_Important: You may need C++ Build Tools installed on Windows to compile `dlib`._

### 4. Database Configuration

The project uses Sequelize. Ensure your database configuration in `src/config/connectDB.js` or `.env` is correct.

---

## 🏃 Running the Application

1. **Start the server**:
   ```bash
   npm start
   ```
2. **Access the application**:
   - Web Interface: `http://localhost:3000`
   - Login Page: `http://localhost:3000/login`
   - Face Registration: `http://localhost:3000/registerFace`

---

## 📝 License

Distributed under the ISC License.

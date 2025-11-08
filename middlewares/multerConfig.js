import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Define the storage directory
// 'process.cwd()' gives the root directory of your project
const uploadDir = path.join(process.cwd(), 'uploads', 'student_pics');

// Ensure the directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer disk storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Get the file extension (e.g., .jpg, .png)
    const extension = path.extname(file.originalname); // Get the rollNo from the request body
    const rollNo = req.body.rollNo;

    if (!rollNo) {
      // This will be caught by the controller's validation
      cb(new Error('Roll number is required to name the file.'), null);
    } else {
      // Create the filename (e.g., "12345CS.jpg")
      // This will overwrite any existing file with the same name
      cb(null, `${rollNo}${extension}`);
    }
  },
});

// Create the multer upload middleware
// We'll accept a single file with the field name 'studentImage'
const uploadStudentPic = multer({ storage: storage }).single('studentImage');

export default uploadStudentPic;

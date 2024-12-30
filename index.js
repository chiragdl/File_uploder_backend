// require('dotenv').config();
// const { Storage } = require('@google-cloud/storage');

// const projectId = process.env.PROJECT_ID;
// const keyFilename = process.env.KEYFILENAME;
// const storage = new Storage({ projectId, keyFilename });

// async function uploadFile(bucketName, filePath, fileOutputName) {
//     try {
//         const bucket = storage.bucket(bucketName);
//         const ret = await bucket.upload(filePath, {
//             destination: fileOutputName,
//         });
//         return ret;
//     } catch (error) {
//         console.error('Error uploading file:', error);
//     }
// }

// (async () => {
//     const ret = await uploadFile(process.env.BUCKET_NAME, 'text.txt', 'success.txt');
//     console.log(ret);
// })();


// Import required modules
const express = require('express');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const cors = require('cors');

// Initialize the app
const app = express();
app.use(cors());
const PORT = process.env.PORT || 3001;

// Handle favicon.ico request manually
app.get('/favicon.ico', (req, res) => res.status(204).send());  // Add this line

// Google Cloud Storage configuration
const storage = new Storage({
  keyFilename: path.join(__dirname, 'key.json'), // Replace with your service account JSON file path
});
const bucketName = 'roombrbucket'; // Replace with your GCS bucket name
const bucket = storage.bucket(bucketName);

// Multer configuration for handling file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // Limit file size to 20MB
  },
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Route to handle the root path
app.get('/', (req, res) => {
  res.send('Welcome to the File Upload API');
});

// API endpoint to upload a file to GCS
app.post('/upload', upload.single('file'), async (req, res) => {
  console.log('Received request:', req.method, req.url);
  console.log('Request body:', req.body);
  console.log('Uploaded file:', req.file);

  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }

    const blob = bucket.file(req.file.originalname);
    const blobStream = blob.createWriteStream({
      resumable: false,
      contentType: req.file.mimetype,
    });

    blobStream.on('error', (err) => {
      console.error('Error uploading file:', err);
      res.status(500).send('Error uploading file.');
    });

    blobStream.on('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${blob.name}`;
      res.status(200).send({
        message: 'File uploaded successfully.',
        fileUrl: publicUrl,
      });
    });

    blobStream.end(req.file.buffer);
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).send('Unexpected error occurred.');
  }
});

// API endpoint to get file previews from GCS
app.get('/files', async (req, res) => {
  try {
    const [files] = await bucket.getFiles();
    const fileUrls = files.map(file => ({
      name: file.name,
      url: `https://storage.googleapis.com/${bucketName}/${file.name}`,
    }));
    res.status(200).send(fileUrls);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).send('Error fetching files.');
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
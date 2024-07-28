require('dotenv').config(); // Load environment variables from .env file
const express = require('express'); // Import Express framework
const {
    S3Client,
    ListObjectsV2Command,
    GetObjectCommand,
    DeleteObjectCommand
} = require('@aws-sdk/client-s3'); // Import AWS SDK v3 S3 client
const multer = require('multer'); // Import Multer for file uploads
const multerS3 = require('multer-s3'); // Import Multer S3 storage engineSS

const app = express(); // Initialize Express app

// Create an S3 client instance
const s3Client = new S3Client({
    region: process.env.REGION,
    credentials: {
        accessKeyId: process.env.ACCESS_KEY,
        secretAccessKey: process.env.ACCESS_SECRET,
    },
}); 

// Get the bucket name from environment variables
const BUCKET_NAME = process.env.BUCKET_NAME;

// Configure Multer for file uploads to S3
const upload = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: BUCKET_NAME,
        metadata: (req, file, cb) => {
            cb(null, { fieldName: file.fieldname }); 
        },
        key: (req, file, cb) => {
            cb(null, file.originalname); 
        },
    }),
});

// Route to handle file uploads
app.post('/upload', upload.single('file'), (req, res) => {
    res.send(`Successfully uploaded to ${req.file.location}!`);
});

// Route to list all files in the S3 bucket
app.get('/list', async (req, res) => {
    try {
        const command = new ListObjectsV2Command({ Bucket: BUCKET_NAME });
        const response = await s3Client.send(command);
        const keys = response.Contents.map(item => item.Key); // Extract file keys from the response
        res.json(keys);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to download a specific file from S3
app.get('/download/:filename', async (req, res) => {
    const { filename } = req.params;
    try {
        const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: filename });
        const response = await s3Client.send(command);
        
        // Set headers for file download
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', response.ContentType);

        // Stream the file content to the response
        response.Body.pipe(res);
    } catch (error) {
        res.status(404).send('File Not Found');
    }
});

// Route to delete a specific file from S3
app.delete('/delete/:filename', async (req, res) => {
    const { filename } = req.params;
    try {
        const command = new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: filename });
        await s3Client.send(command);
        res.send('File Deleted Successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Set the port for the server
const PORT = process.env.PORT || 3000; 

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

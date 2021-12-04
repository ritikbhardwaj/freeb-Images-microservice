/* This API is sort of a proxy between the main API
 * and AWS S3.
 *
 * Responsibilities of this API:
 * 	- Upload images to S3
 *  - Get image streams from S3
 *  - Delete images from S3
 *
 * The reason why this was kept separate and not merged with the main
 * APi is that if any image processing is required at the backend it would
 * be done here. Since image processing is CPU heavy, it can block the
 * single thread that node.js runs on. Also in case of errors only this
 * API would crash and the main API would keep handling requests.
 *
 * Author: Ritik Bhardwaj
 */

require('dotenv').config();
const express = require('express'),
	app = express(),
	morgan = require('morgan'),
	multer = require('multer'),
	upload = multer({ dest: 'uploads/' }),
	fs = require('fs'),
	util = require('util'),
	S3 = require('aws-sdk/clients/s3'),
	unlinkFile = util.promisify(fs.unlink),
	path = require('path');

//fetch the environment variables
const bucketName = process.env.AWS_BUCKET_NAME,
	region = process.env.AWS_BUCKET_REGION,
	accessKeyId = process.env.AWS_ACCESS_KEY,
	secretAccessKey = process.env.AWS_SECRET_KEY,
	PORT = 3000 || process.env.PORT;

//init the s3 object
const s3 = new S3({
	region,
	accessKeyId,
	secretAccessKey,
});

//middlewares
app.use(
	morgan('common', {
		stream: fs.createWriteStream(path.join(__dirname, 'access.log'), {
			flags: 'a',
		}),
	})
);
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

//routes

//get the image stream
app.get('api/s3/images/:key', async (req, res) => {
	const downloadParams = {
		Key: req.params.key,
		Bucket: bucketName,
	};
	const fileStream = s3.getObject(downloadParams).createReadStream();
	fileStream.on('error', (err) => {
		return res
			.status(400)
			.json({ status: 400, code: 'Bad request', message: err.message });
	});
	fileStream.pipe(res);
});

//post image to the server
app.post('api/s3/images', upload.single('image'), async (req, res) => {
	if (!req.file) {
		return res.status(400).json({
			status: 400,
			code: 'Bad request.',
			message: 'No file uploaded.',
		});
	}
	const { path, filename } = req.file;
	const fileStream = fs.createReadStream(path);
	const uploadParams = {
		Bucket: bucketName,
		Body: fileStream,
		Key: filename,
	};
	const result = s3.upload(uploadParams).promise();
	result
		.then((data) => {
			console.log('Upload Done');
			res.status(200).json({ status: 200, type: 'OK', message: data });
		})
		.catch((err) => {
			res.status(502).json({
				status: 502,
				code: 'Bad gateway',
				message: err,
			});
		});
	await unlinkFile(path);
});

//delete a image with the id
app.delete('api/s3/images/:key', (req, res) => {
	const deleteParams = {
		Bucket: bucketName,
		Key: req.params.key,
	};
	const result = s3.deleteObject(deleteParams).promise();
	result
		.then((data) => {
			console.log('Delete done!');
			return res
				.status(200)
				.json({ status: 200, type: 'OK', message: data });
		})
		.catch((err) => {
			return res.status(502).json({
				status: 502,
				code: 'Bad gateway',
				message: err,
			});
		});
});

app.listen(PORT, () => {
	console.log(`Image server listening on - ${PORT}`);
});

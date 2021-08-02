require('dotenv').config();
const express = require('express');
const app = express();
const morgan = require('morgan');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const fs = require('fs');
const util = require('util');
const S3 = require('aws-sdk/clients/s3');
const unlinkFile = util.promisify(fs.unlink);
const path = require('path');
const PORT = 3000 || process.env.PORT;

//fetch the environment variables
const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_BUCKET_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;

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
app.get('/images/:key', async (req, res) => {
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
app.post('/images', upload.single('image'), async (req, res) => {
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
			res.status(200).json({ status: 200, type: 'OK', message: data });
		})
		.catch((err) => {
			res.status(502).json({
				status: 502,
				code: 'Bad gateway',
				message: err,
			});
		});
	//console.log(result);
	//filter
	//resize
	//compress
	await unlinkFile(path);
});

//delete a image with the id
app.delete('/images/:key', (req, res) => {
	const deleteParams = {
		Bucket: bucketName,
		Key: req.params.key,
	};
	const result = s3.deleteObject(deleteParams).promise();
	result
		.then((data) => {
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

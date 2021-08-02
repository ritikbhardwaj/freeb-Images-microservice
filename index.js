require('dotenv').config();
const express = require('express');
const app = express();
const morgan = require('morgan');
const helmet = require('helmet');
const uniqid = require('uniqid');
const multer = require('multer');
const stream = require('stream');
const fs = require('fs');
const util = require('util');
const unlinkFile = util.promisify(fs.unlink); //to promisify the fs.unlink function
const path = require('path');
const { uploadFile, getFileStream } = require('./s3');
const PORT = 3000 || process.env.PORT;

//multer middleware setup
const upload = multer({ dest: 'uploads/' });

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

//get the image links from sql database
app.get('/images', (req, res) => {
	const { base, limit } = req.query;
	if (!isNaN(parseInt(limit)) && !isNaN(parseInt(limit))) {
		res.send(req.query.base + ' ' + req.query.limit);
	} else {
		res.send('Please mention base and limit');
	}
});

//get the image stream
app.get('/images/:key', async (req, res) => {
	const key = req.params.key;
	const readableStream = new stream.Readable();
	const fileStream = getFileStream(key);
	fileStream.pipe(res);
});

//post image to the server
app.post('/images', upload.single('image'), async (req, res) => {
	const file = req.file;

	//filter
	//resize
	//compress

	const result = await uploadFile(file);
	await unlinkFile(file.path);
	console.log(result);
});

//delete a image with the id
app.delete('images/:id', (req, res) => {});

app.listen(PORT, () => {
	console.log(`Image server listening on - ${PORT}`);
});

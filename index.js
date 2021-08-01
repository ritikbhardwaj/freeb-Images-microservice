require('dotenv').config();
const app  = require('express')();
const bodyParser = require('body-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');
const { uploadFile, getFileStream } = require('./s3');
const PORT  = 3000 || process.env.PORT;

//middlewares
app.use(morgan('common', {
	stream: fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' })
}));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());


//routes

//get the image links from sql database
app.get('/images', (req,res)=>{
	const { base, limit } = req.query;
	if(!isNaN(parseInt(limit)) && !isNaN(parseInt(limit))){
		res.send(req.query.base + ' ' + req.query.limit);
	}else{
		res.send('Please mention base and limit');
	}
});

//get the image stream
app.get('/images/:key', (req,res)=>{
	const key  = req.params.key;
	const readStream = getFileStream(key);
	readStream.pipe(res);
});

//post image to the server
app.post('/images',(req,res)=>{});

//delete a image with the id
app.delete('images/:id', (req,res)=>{});



app.listen(PORT,()=>{
	console.log(`Image server listening on - ${PORT}`);
});

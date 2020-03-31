//required modules
const express = require('express');
const ejs = require('ejs');
const mongoose = require('mongoose');
const parser = require('body-parser');
const path = require('path');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const crypto = require('crypto');
const multer = require('multer');
const PORT = process.env.PORT || 8000;


const app = express();

//setting the middleware
app.use(parser.json());
app.use(parser.urlencoded({extended:true}));
app.set('view engine', 'ejs');
app.set('views','./views');


//database connection
const dbURI = ''; //HIDING THIS FOR SECURITY PURPOSE
const connection = mongoose.createConnection(dbURI);

//GridFS stream, will be initialized when database connection is set
let gfs;

//GridFS storage
var storage = new GridFsStorage({

    url: dbURI,
    file: (req, file) => {
      return new Promise((resolve, reject) => {

        //generate a random new name for the file
        crypto.randomBytes(8, (err, buf) => {
          if (err) {
            return reject(err);
          }

          //modify the file name
          const filename = buf.toString('hex')+path.extname(file.originalname);
          const fileInfo = {
            filename: filename,
            bucketName: 'fileuploads'
          };

          //resolve the promise
          resolve(fileInfo);

        });
      });
    }

  });

// file upload middleware  
const upload = multer({ storage });


//route1 (GET) : main page 
app.get('/', (req,res)=>{
    gfs.files.find().toArray((error, files)=>{

        //return 'index' view with all files found
        res.render('index',{'files':files});
        
    });     
});

//route2 (POST): upload single file through 'upload' middleware
app.post('/',upload.single('file'),(req,res)=>{

    //redirecting to main page
    res.redirect('/');    

});


//route3 (GET) : get a single file with provided 'name'
app.get('/getfile/:name', (req,res)=>{

    //find file with that name
    gfs.files.findOne({filename:req.params.name}, (err, file)=>{
        if(err || !file || file.length===0){

            //handle error
            return res.status(404).json({
                "error":"No file found."
            });
        } else {            

            //pipe content with response
            const readstream = gfs.createReadStream(file.filename);
            readstream.pipe(res);            
        }
    });

});


//route4 (POST) : delete file with provided 'file id'
app.post('/deleteFile/:idFile',(req,res)=>{
    gfs.remove({_id:req.params.idFile, root:'fileuploads'},(error,gridStore)=>{
        if(error){

            //handle error
            res.send('Error deleting file.');

        } else {

            //redirect to main page
            res.redirect('/');   
        }
        
    });
});

//route5 (GET) : handle invalid requests
app.get('*',(req,res)=>{
    res.send("Page not found!");
})

//once connection with database is set, assign the GridFS Stream and start listening to the port
connection.once('open', ()=>{

    gfs = Grid(connection.db, mongoose.mongo);

    //collection name for uploading files
    gfs.collection('fileuploads');

    app.listen(PORT, ()=>{
        console.log("Listening to port : "+PORT);
    });

});




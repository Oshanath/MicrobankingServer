var express = require('express');
const db = require("./database");
var bodyParser = require('body-parser');
var crypto = require('crypto');

var app = express();
var jsonParser = bodyParser.json()
// var urlencodedParser = bodyParser.urlencoded({ extended: false })

function hash(string){
   var hash = crypto.createHash('sha256').update(string).digest('base256');
   let s = "";

   for(let i = 0; i < hash.length; i++){
      s += String.fromCharCode(hash[i]);
   }

   return s;
}

app.use(bodyParser.urlencoded({
   extended: true
 }));

app.get('/', function (req, res) {
   res.render('signin.ejs');
});

app.post('/signin', function (req, res) {
   let username = req.body.username;
   let password = req.body.password;

   database.query(`SELECT * FROM manager WHERE username = "${username}"`, (err, result) => {
      console.log(result);
      let r = "";

      if(result.password === password){
         r = "success";
      }
      else{
         r = "failure";
      }
      res.render(`home.ejs`, {r});
   });

});

app.get('/syncAgent/:agentID', function (req, res) {
   let agentID = req.params.agentID;
   console.log("sync agent");

   database.query(`SELECT * FROM
      account INNER JOIN account_registered USING(number)
      INNER JOIN account_customer USING(number) 
      INNER JOIN customer USING(nic) 
      where registered = true;`, 
   (err, result) => {
      res.send(JSON.stringify(result));
   });
});

app.post(`/criticalVerify`, function(req, res){
   console.log("critical verify");
   console.log(req.body);
   res.send(req.body);
});

app.post(`/criticalTransaction`, function(req, res){
   console.log("critical Transaction");
   console.log(req.body);
   res.send(req.body);
});


// Express server
var server = app.listen(8083, function () {
   var host = server.address().address
   var port = server.address().port
   
   console.log("Example app listening at http://", host, port);
});

const database = db.createConnection();

database.connect((err) => {
   if (err) throw err;
   console.log('Connected to MySQL Server!');

   db.dropTablesAndInsertDummyData();

});

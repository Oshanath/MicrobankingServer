var express = require('express');
const db = require("./database");
var bodyParser = require('body-parser');

var app = express();
var jsonParser = bodyParser.json()
var urlencodedParser = bodyParser.urlencoded({ extended: false })

app.get('/', function (req, res) {
   res.render('signin.ejs');
});

app.post('/signin', urlencodedParser, function (req, res) {
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

   database.query(`SELECT DISTINCT * FROM
      account INNER JOIN account_registered USING(number)
      INNER JOIN account_customer USING(number) 
      INNER JOIN customer USING(nic) 
      where registered = true;`, 
   (err, result) => {
      res.send(JSON.stringify(result));
   });
});

app.get(`/critialVerify`, function(req, res){
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

var express = require('express');
const db = require("./database");
var bodyParser = require('body-parser');

var app = express();
var jsonParser = bodyParser.json()
// var urlencodedParser = bodyParser.urlencoded({ extended: false })
var hash = db.hash;

app.use(bodyParser.urlencoded({
   extended: true
 }));

app.get('/', function (req, res) {
   res.render('signin.ejs', {"r": "none"});
});

app.post('/signin', function (req, res) {
   let username = req.body.username;
   let password = req.body.password;

   let r = {};

   database.query(`SELECT * FROM manager WHERE username = "${username}"`, (err, result) => {
      console.log(result);
      
      if(result.length == 0) r.result = "user not found";
      else{
         if(!db.compareHash(hash(password), result[0].password)){
            r.result = "password mismatch";
         }
         else{
            r.result = "success";
         }
      }

      if(r.result === "success") res.render(`home.ejs`, {"r": r.result});
      else res.render(`signin.ejs`, {"r": r.result});
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
   console.log(req.body);

   let found = false;

   database.query(`SELECT * FROM account INNER JOIN account_customer USING(number)
   INNER JOIN account_pin USING (number) WHERE number = ${req.body.acc_no}`, (err, result) => {
      
      for(let i = 0; i < result.length; i++){
         if(result[i].nic === req.body.nic){

            found = true;

            if(db.compareHash(hash(req.body.pin), result[i].pin)){
               res.send(JSON.stringify({"message": "success"}));
               break;
            }
            else{
               res.send(JSON.stringify({"message": "wrong pin"}));
            }
         }
      }

      if(!found){
         res.send(JSON.stringify({"message": "unregistered"}));
      }
   });
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

var express = require('express');
const db = require("./database")

var app = express();

app.get('/', function (req, res) {
   res.send('Hello World');
});

app.get('/index', function (req, res) {
   res.send('Index page');
});

app.get('/syncAgent/:agentID', function (req, res) {
   let agentID = req.params.agentID;

   // Select all customers where agent = agentId
   // Select all the registered accounts of thoses customers
   database.query(`SELECT * FROM account_customer NATURAL JOIN customer NATURAL JOIN account NATURAL JOIN account_critical WHERE agentID="${agentID}" AND account.registered=true;`, 
   (err, result) => {
      console.log(result);
      res.send(result);
   });
});

// Express server
var server = app.listen(8081, function () {
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

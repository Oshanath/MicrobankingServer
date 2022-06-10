var express = require('express');
const mysql = require('mysql');

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

// MySQL server
const database = mysql.createConnection({
   host: 'localhost',
   user: 'root',
   password: 'password',
   database: 'mydb'
 });

database.connect((err) => {
   if (err) throw err;
   console.log('Connected to MySQL Server!');

   database.query("DROP TABLE account_customer");
   database.query("DROP TABLE account");
   database.query("DROP TABLE customer");
   database.query("DROP TABLE agent");
   database.query("DROP TABLE account_critical");

   database.query("CREATE TABLE account(number INT, balance FLOAT NOT NULL, joint BOOLEAN NOT NULL, registered BOOLEAN NOT NULL, PRIMARY KEY (number));");
   database.query("CREATE TABLE agent(agentID VARCHAR(20), name VARCHAR(50) NOT NULL, password VARCHAR(50) NOT NULL, PRIMARY KEY (agentID));");
   database.query("CREATE TABLE customer(nic VARCHAR(20), name VARCHAR(50) NOT NULL, agentID VARCHAR(20) NOT NULL, PRIMARY KEY (nic), FOREIGN KEY (agentID) references agent(agentID));");
   database.query("CREATE TABLE account_customer(number INT, nic VARCHAR(20), FOREIGN KEY (number) REFERENCES account(number), FOREIGN KEY (nic) REFERENCES customer(nic));");
   database.query("CREATE TABLE account_critical(number INT, critical BOOLEAN);");

   database.query("INSERT INTO account VALUES (12332555, 45666.56, true, true);");
   database.query("INSERT INTO account VALUES (65468467, 45666.56, true, false);");
   database.query("INSERT INTO account VALUES (34635764, 45666.56, false, true);");
   database.query("INSERT INTO account VALUES (33455546, 45666.56, false, true);");
   database.query("INSERT INTO account VALUES (85469699, 45666.56, false, true);");
   database.query("INSERT INTO account VALUES (45673858, 45666.56, false, true);");
   database.query("INSERT INTO account VALUES (09887755, 45666.56, false, true);");
   database.query("INSERT INTO account VALUES (16683568, 45666.56, false, true);");
   database.query("INSERT INTO account VALUES (23580987, 45666.56, false, true);");
   database.query("INSERT INTO account VALUES (10885446, 45666.56, false, true);");
   database.query("INSERT INTO account VALUES (65584445, 45666.56, false, false);");
   database.query("INSERT INTO account VALUES (78654555, 45666.56, false, false);");

   database.query("INSERT INTO agent VALUES(\"190488J\", \"Oshanath\", \"password\");");
   database.query("INSERT INTO agent VALUES(\"190564L\", \"Rajawasam\", \"password\");");

   database.query("INSERT INTO customer VALUES(\"991741135v\", \"Lasith\", \"190488J\");");
   database.query("INSERT INTO customer VALUES(\"246757377f\", \"Ravindu\", \"190488J\");");
   database.query("INSERT INTO customer VALUES(\"34634g575jj\", \"Thilina\", \"190564L\");");
   database.query("INSERT INTO customer VALUES(\"rsgrrd44646\", \"Madaya\", \"190564L\");");

   database.query("INSERT INTO account_customer VALUES(12332555, \"991741135v\");");
   database.query("INSERT INTO account_customer VALUES(65468467, \"991741135v\");");
   database.query("INSERT INTO account_customer VALUES(34635764, \"991741135v\");");
   database.query("INSERT INTO account_customer VALUES(33455546, \"246757377f\");");
   database.query("INSERT INTO account_customer VALUES(45673858, \"246757377f\");");
   database.query("INSERT INTO account_customer VALUES(09887755, \"34634g575jj\");");
   database.query("INSERT INTO account_customer VALUES(09887755, \"rsgrrd44646\");");

   database.query("INSERT INTO account_critical VALUES(12332555, true);");
   database.query("INSERT INTO account_critical VALUES(34635764, false);");
   database.query("INSERT INTO account_critical VALUES(33455546, false);");
   database.query("INSERT INTO account_critical VALUES(85469699, true);");
   database.query("INSERT INTO account_critical VALUES(45673858, false);");
   database.query("INSERT INTO account_critical VALUES(09887755, false);");
   database.query("INSERT INTO account_critical VALUES(16683568, false);");
   database.query("INSERT INTO account_critical VALUES(23580987, true);");
   database.query("INSERT INTO account_critical VALUES(10885446, false);");

});

console.log("here");
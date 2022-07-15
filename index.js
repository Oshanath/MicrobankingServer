var express = require('express');
const db = require("./database");
var bodyParser = require('body-parser');
const { query } = require('express');

var app = express();
var jsonParser = bodyParser.json()
// var urlencodedParser = bodyParser.urlencoded({ extended: false })
var hash = db.hash;

app.use(bodyParser.urlencoded({
   extended: true
}));

app.get('/', function (req, res) {
   res.render('signin.ejs', { "r": "none" });
});

app.post("/agentSignIn", (req, res) => {

   database.query(`SELECT * FROM agent WHERE agentID = ?`, [req.body.agentID], (err, result) => {
      let r = {};

      if(result.length == 0) r.result = "user not found";
      else{
         if(!db.compareHash(hash(req.body.password), result[0].password)){
            r.result = "password mismatch";
         }
         else {
            r.result = "success";
         }
      }

      res.send(r);
   });
});

app.post('/signin', function (req, res) {
   let username = req.body.username;
   let password = req.body.password;

   let r = {};

   database.query(`SELECT * FROM manager WHERE username = "${username}"`, (err, result) => {
      
      if(result.length == 0) r.result = "user not found";
      else{
         if(!db.compareHash(hash(password), result[0].password)){
            r.result = "password mismatch";
         }
         else {
            r.result = "success";
         }
      }

      if(r.result === "success") res.render(`home.ejs`, {"type": "none", "agentID": "", "accountNumber": ""});
      else res.render(`signin.ejs`, {"r": r.result});
   });

});

app.get('/syncAgent/:agentID', function (req, res) {
   let agentID = req.params.agentID;
   console.log("sync agent");

   database.query(`SELECT DISTINCT * FROM
      account INNER JOIN account_registered USING(number)
      INNER JOIN account_customer USING(number) 
      INNER JOIN customer USING(nic) 
      INNER JOIN account_pin USING(number)
      where registered = true;`, 
   (err, result) => {

      for(let j = 0; j < result.length; j++){
         let  pinBuffer = result[j].pin;
         let pinArray = [];

         for(let i = 0; i < pinBuffer.length; i++){
            pinArray.push(pinBuffer[i]);
         }
         result[j].pin = pinArray;
      }

      res.send(JSON.stringify(result));
   });
});

app.post(`/criticalVerify`, function (req, res) {
   console.log(req.body);

   let found = false;

   database.query(`SELECT * FROM account INNER JOIN account_customer USING(number)
   INNER JOIN account_pin USING (number) WHERE number = ${req.body.acc_no}`, (err, result) => {

      for (let i = 0; i < result.length; i++) {
         if (result[i].nic === req.body.nic) {
            found = true;

            if (db.compareHash(hash(req.body.pin), result[i].pin)) {
               res.send(JSON.stringify({ "message": "success", "balance": result[i].balance, "type": result[i].balance }));
               break;
            }
            else {
               res.send(JSON.stringify({ "message": "wrong pin" }));
            }
         }
      }

      if (!found) {
         res.send(JSON.stringify({ "message": "unregistered" }));
      }
   });
});

app.post(`/criticalTransaction`, function (req, res) {
   console.log("critical Transaction");
   console.log(req.body);

   let ac_number = req.body.acc_no;
   let amount = parseFloat(req.body.amount);
   let trasaction_type = req.body.type;
   let ac_balance;

   
   database.query(`SELECT balance FROM account WHERE number = ${ac_number}`, (err, resultAllAccounts) => {
      ac_balance = resultAllAccounts[0][`balance`];
      
      if (trasaction_type === `Withdraw` && ac_balance >= amount) {
         ac_balance -= amount;
      }else if (trasaction_type === `Deposit`) {
         ac_balance += amount;
      }
      database.query(`START TRANSACTION;`);
      database.query(`UPDATE account SET balance = ${ac_balance} where number = ${ac_number};`);
      database.query(`COMMIT;`,(err, commitResult) =>{
         if(err == null){
            res.send(JSON.stringify({ "message": "success" }));
         }else{
            res.send(JSON.stringify({ "message": "fail" }));
         }
      });
   });
   
});

app.post(`/normalTransaction`, function (req, res) {
   console.log("Normal Transaction");
   console.log(req.body);
   
});

function countTransactions(result){
   let data = {};

   for(let i = 0; i < result.length; i++){
      let month = `${result[i].datetime.getFullYear()}-${result[i].datetime.getMonth() + 1}`;
      if(!data[month]){
         data[month] = {
            "trans": 1,
            "with": result[i].trans_type === "w" ? 1 : 0,
            "dep": result[i].trans_type === "d" ? 1 : 0
         };
      }
      else{
         data[month].trans += 1;  
         if(result[i].trans_type === "w") data[month].with += 1;
         else data[month].dep += 1;
      }
   }

   return data;
}

app.post("/agentSummary", (req, res) => {

   database.query(`SELECT DISTINCT * FROM transaction_agent_index WHERE agentID = ?`, [req.body.agentID], (err, result) => {
      let data = countTransactions(result);
      res.render("home.ejs", {type: "agentSummary", "agentID": req.body.agentID, "accountNumber": "", data});
   });

});

const getDays = (year, month) => {
   return new Date(year, month, 0).getDate();
};

app.post("/agentTransactions", (req, res) => {
   let query = "";

   if(req.body.year === "" && req.body.month === "")
      query = `SELECT DISTINCT * FROM transaction_agent_index WHERE agentID=? ORDER BY (datetime)`;

   else if(req.body.month === "")
      query = `SELECT DISTINCT * FROM transaction_agent_index WHERE agentID=? AND datetime BETWEEN 
      '${req.body.year}-1-1 00:00:00' AND '${req.body.year}-12-31 23:59:59' ORDER BY (datetime)`;

   else
      query = `SELECT DISTINCT * FROM transaction_agent_index WHERE agentID=? AND datetime BETWEEN 
      '${req.body.year}-${req.body.month}-1 00:00:00' AND
      '${req.body.year}-${req.body.month}-${getDays(req.body.year, req.body.month)} 23:59:59' ORDER BY (datetime)`;

   database.query(query, [req.body.agentID], (err, result) => {
      let data =[];

      for(let i = 0; i < result.length; i++){
         data.push({
            month : `${result[i].datetime.getFullYear()}-${result[i].datetime.getMonth() + 1}`,
            number: result[i].number,
            type: result[i].trans_type === "w" ? "Withdrawal" : "Deposit",
            amount: result[i].amount,
            date: `${result[i].datetime.getFullYear()}-${result[i].datetime.getMonth() + 1}-${result[i].datetime.getDate()}`
         });
      }

      res.render("home.ejs", {type: "agentTransactions", "agentID": req.body.agentID, "accountNumber": "", data});
   });

});

app.post("/accountSummary", (req, res) => {

   database.query(`SELECT DISTINCT * FROM transaction_account_index WHERE number=?`, [req.body.accountNo], (err, result) => {
      let data = countTransactions(result);
      res.render("home.ejs", {type: "accountSummary", "agentID": "", "accountNumber": req.body.accountNo, data});
   });

});

app.post("/accountTransactions", (req, res) => {
   console.log(req.body);

   let query = "";

   if(req.body.year === "" && req.body.month === "")
      query = `SELECT DISTINCT * FROM transaction_account_index WHERE number=? ORDER BY (datetime)`;

   else if(req.body.month === "")
      query = `SELECT DISTINCT * FROM transaction_account_index WHERE number=? AND datetime BETWEEN 
      '${req.body.year}-1-1 00:00:00' AND '${req.body.year}-12-31 23:59:59' ORDER BY (datetime)`;

   else
      query = `SELECT DISTINCT * FROM transaction_account_index WHERE number=? AND datetime BETWEEN 
      '${req.body.year}-${req.body.month}-1 00:00:00' AND
      '${req.body.year}-${req.body.month}-${getDays(req.body.year, req.body.month)} 23:59:59' ORDER BY (datetime)`;

   database.query(query, [req.body.accountNo], (err, result) => {
      let data =[];

      for(let i = 0; i < result.length; i++){
         data.push({
            month : `${result[i].datetime.getFullYear()}-${result[i].datetime.getMonth() + 1}`,
            agentID: result[i].agentID,
            type: result[i].trans_type === "w" ? "Withdrawal" : "Deposit",
            amount: result[i].amount,
            date: `${result[i].datetime.getFullYear()}-${result[i].datetime.getMonth() + 1}-${result[i].datetime.getDate()}`
         });
      }
      console.log(data);

      res.render("home.ejs", {type: "accountTransactions", "agentID": "", "accountNumber": req.body.accountNo, data});
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

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
   res.render('signin.ejs', { "r": "none" });
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
   for(let [key, value] of Object.entries(req.body)){
      
      let arr = JSON.parse(value);

      let t_accNo = parseInt(arr[`accNo`]);
      let t_amount = parseFloat(arr[`amount`]);
      let t_type = arr[`type`];
      let t_date = arr[`date`]; 
      let ac_bal;
      let trans_type;

      database.query(`SELECT balance FROM account WHERE number = ${t_accNo}`, (err, resultBal) => {
         ac_bal = resultBal[0][`balance`];   
         
         //console.log(ac_bal);
         if( t_type === `Withdraw` && ac_bal >= t_amount){
            ac_bal -= t_amount;
            trans_type = 'w';
            console.log("Withdrawing");
         }else if( t_type === `Deposit`){
            ac_bal += t_amount;
            trans_type = 'd';
            console.log("Depositing");
         }

         //console.log(ac_bal);
         database.query(`START TRANSACTION;`);
         database.query(`UPDATE account SET balance = ${ac_bal} where number = ${t_accNo};`);
         //database.query(`INSERT INTO transactions VALUES(${t_accNo}, ${trans_type}, ${ac_bal}, ${t_date});`);
         database.query(`COMMIT;`,(err, commitResult) =>{
            
            database.query(`SELECT balance FROM account WHERE number = ${t_accNo}`, (err, resultBal) => {
               ac_bal = resultBal[0][`balance`];
               console.log(ac_bal);
            });  
            // if(err == null){
            //    console.log("DONE");
            //    res.send(JSON.stringify({ "message": "success" }));
               
            // }else{
            //    res.send(JSON.stringify({ "message": "fail" }));
            // }
         });
         
      });  
   }   
});

app.post("/agentSummary", (req, res) => {
   console.log(req.body);

   database.query(`SELECT DISTINCT * FROM transactions WHERE agentID = ?`, [req.body.agentID], (err, result) => {

      console.log(result);
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
      console.log(data);

      res.render("home.ejs", {type: "agentSummary", "agentID": req.body.agentID, "accountNumber": "", data});
   });

});

app.post("/agentTransactions", (req, res) => {
   console.log(req.body);
   let data =[];

   database.query(`SELECT DISTINCT * FROM transactions WHERE agentID=? ORDER BY (datetime)`, [req.body.agentID], (err, result) => {

      for(let i = 0; i < result.length; i++){
         data.push({
            month : `${result[i].datetime.getFullYear()}-${result[i].datetime.getMonth() + 1}`,
            number: result[i].number,
            type: result[i].trans_type === "w" ? "Withdrawal" : "Deposit",
            amount: result[i].amount,
            date: `${result[i].datetime.getFullYear()}-${result[i].datetime.getMonth() + 1}-${result[i].datetime.getDate()}`
         });
      }
      console.log(data);

      res.render("home.ejs", {type: "agentTransactions", "agentID": req.body.agentID, "accountNumber": "", data});
   });

});

app.post("/accountSummary", (req, res) => {
   console.log(req.body);
   res.render("home.ejs", {type: "accountSummary", "agentID": req.body.agentID, "accountNumber": ""});
});

app.post("/accountTransactions", (req, res) => {
   console.log(req.body);
   res.render("home.ejs", {type: "accountTransactions"});
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

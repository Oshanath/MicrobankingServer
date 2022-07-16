const mysql = require('mysql');
var crypto = require('crypto');

let database = null;

function createConnection() {
    database = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'root',
        database: 'mydb'
    });
    return database;
}

function hash(string){
    return crypto.createHash('sha256').update(string).digest('base256');
}

function compareHash(hash1, hash2){

    let equals = true;

    for(let i = 0; i < hash1.length; i++){
        if(hash1[i] !== hash2[i]){
            equals = false;
            break;
        }
    }

    return equals;

}

async function calculateInterests() {

    let numberOFAcoounts;
    database.query("SELECT count(*) from account;",
        (err, result) => {
            numberOFAcoounts = result[0][`count(*)`];

            database.query(`SELECT number,balance,type from account;`,
                (err, resultAllAccounts) => {
                    for (let i = 0; i < numberOFAcoounts; i++) {
                        let balance;
                        let num;
                        let acType;

                        balance = resultAllAccounts[i][`balance`];
                        num = resultAllAccounts[i][`number`];
                        acType = resultAllAccounts[i][`type`];
                        if (!acType.localeCompare(`child`)) {
                            balance += balance * 0.12;
                            
                            //console.log(balance);
                        } else if (!acType.localeCompare(`teen`) && balance >= 500) {
                            balance += balance * 0.11;
                        } else if (!acType.localeCompare(`adult`) && balance >= 1000) {
                            balance += balance * 0.1;
                        } else if (!acType.localeCompare(`senior`) && balance >= 1000) {
                            balance += balance * 0.13;
                        } else if (!acType.localeCompare(`joint`) && balance >= 5000) {
                            balance += balance * 0.07;
                        }

                        database.query(`UPDATE account SET balance = ${balance} where number = ${num};`);

                    }

                });

        });


    database.query(`SELECT number,balance,type from account;`,
        (err, result3) => {
            console.log(result3);
        });
}

function dropTablesAndInsertDummyData() {
    database.query(`DROP TABLE IF EXISTS account_customer;`);           // done
    database.query(`DROP TABLE IF EXISTS account_registered;`);         // done
    database.query(`DROP TABLE IF EXISTS account_critical;`);           // done
    database.query(`DROP TABLE IF EXISTS account_pin`);                 // done
    database.query(`DROP TABLE IF EXISTS fixed_deposit;`);              // done
    database.query(`DROP TABLE IF EXISTS transactions;`);               // done
    database.query(`DROP TABLE IF EXISTS account;`);                    // done
    database.query(`DROP TABLE IF EXISTS customer;`);                   // done
    database.query(`DROP TABLE IF EXISTS agent;`);                      // done
    database.query(`DROP TABLE IF EXISTS area`);                        // done
    database.query(`DROP TABLE IF EXISTS manager;`);                    // done

    database.query("DROP PROCEDURE IF EXISTS calculateInterests");
    database.query("DROP PROCEDURE IF EXISTS calFDInterests");

    database.query("DROP EVENT IF EXISTS add_savings_interests");
    database.query("DROP EVENT IF EXISTS add_fd_interests");

    database.query(`CREATE TABLE account(
        number INT, 
        balance NUMERIC(12,2) NOT NULL, 
        type VARCHAR(10) NOT NULL, 
        PRIMARY KEY (number),
        CHECK(type in ("child", "teen", "adult", "senior", "joint")),
        CHECK(balance >= 0.00)
    );`);

    database.query(`CREATE TABLE area(
        code INT NOT NULL,
        name VARCHAR(20) NOT NULL,
        PRIMARY KEY(code)
    )`);
        
    database.query(`CREATE TABLE agent(
        agentID VARCHAR(20), 
        name VARCHAR(50) NOT NULL, 
        password BLOB NOT NULL, 
        code INT,
        PRIMARY KEY (agentID),
        FOREIGN KEY(code) REFERENCES area(code)
    );`);
        
    database.query(`CREATE TABLE customer(
        nic VARCHAR(20), 
        name VARCHAR(50) NOT NULL, 
        code INT NOT NULL,
        PRIMARY KEY (nic),
        FOREIGN KEY (code) references area(code)
    );`);
        
    database.query(`CREATE TABLE account_customer(
        number INT, 
        nic VARCHAR(20), 
        FOREIGN KEY (number) REFERENCES account(number), 
        FOREIGN KEY (nic) REFERENCES customer(nic),
        PRIMARY KEY (number, nic)
    );`);
        
    database.query(`CREATE TABLE account_critical(
        number INT, 
        critical BOOLEAN,
        FOREIGN KEY (number) REFERENCES account(number)
    );`);
        
    database.query(`CREATE TABLE account_registered(
        number INT, 
        registered BOOLEAN NOT NULL, 
        FOREIGN KEY (number) REFERENCES account(number)
    );`);
        
    database.query(`CREATE TABLE fixed_deposit(
        fd_number INT NOT NULL, 
        number INT NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        plan VARCHAR(10) NOT NULL,
        PRIMARY KEY (fd_number),
        FOREIGN KEY (number) REFERENCES account(number),
        CHECK(plan in ("1y", "3y", "6m"))
    );`);
        
    database.query(`CREATE TABLE manager(
        username VARCHAR(20) NOT NULL,
        password BLOB NOT NULL,
        PRIMARY KEY (username)
    )`);

    database.query(`CREATE TABLE account_pin(
        number INT NOT NULL, 
        pin BLOB NOT NULL,
        PRIMARY KEY (number), 
        FOREIGN KEY(number) REFERENCES account(number)
    )`);

//either `w` or `d` for trans Type
//'YYYY-MM-DD hh:mm:ss'

    database.query(`CREATE TABLE transactions(
        number INT NOT NULL,
        trans_type VARCHAR(1) NOT NULL,  
        amount NUMERIC(12,2) NOT NULL,
        datetime DATETIME NOT NULL,
        agentID VARCHAR(20),
        CHECK(trans_type in ('w', 'd')),
        FOREIGN KEY (agentID) REFERENCES agent(agentID),
        FOREIGN KEY (number) REFERENCES account(number)
    )`);

    database.query(`CREATE INDEX transaction_agent_index ON transactions(agentID);`);
    database.query(`CREATE INDEX transaction_account_index ON transactions(number);`);
        
        // Functions and procedures
    database.query(`
            
    CREATE PROCEDURE calculateInterests()
    BEGIN
        
        DECLARE num INT DEFAULT 0;
        DECLARE bal NUMERIC(12,2) DEFAULT 0.00;
        DECLARE acType VARCHAR(10) DEFAULT "";

        DECLARE bdone INT;

        DECLARE curs CURSOR FOR SELECT number,balance,type FROM account;
        DECLARE CONTINUE HANDLER FOR NOT FOUND SET bdone = 1;

        OPEN curs;

        SET bdone=0;
        REPEAT
            FETCH curs INTO num,bal,acType;

            IF acType = 'child' THEN
                START TRANSACTION;
                UPDATE account SET balance = balance + balance*0.12 WHERE number = num;
                COMMIT;
            ELSEIF acType = 'teen' AND bal >= 500 THEN
                START TRANSACTION;
                UPDATE account SET balance = balance + balance*0.11 WHERE number = num;
                COMMIT;
            ELSEIF acType = 'adult' AND bal >= 1000 THEN
                START TRANSACTION;
                UPDATE account SET balance = balance + balance*0.1 WHERE number = num;
                COMMIT;
            ELSEIF acType = 'senior' AND bal >= 1000 THEN
                START TRANSACTION;
                UPDATE account SET balance = balance + balance*0.13 WHERE number = num;
                COMMIT;
            ELSEIF acType = 'joint' AND bal >= 5000 THEN
                START TRANSACTION;
                UPDATE account SET balance = balance + balance*0.07 WHERE number = num;
                COMMIT;
            END IF;
           
                
        UNTIL bdone END REPEAT;
        CLOSE curs;
        
    END; `);

    database.query(`
    CREATE PROCEDURE calFDInterests()
    BEGIN
        DECLARE num INT DEFAULT 0;
        DECLARE fdAmount NUMERIC(12,2) DEFAULT 0.00;
        DECLARE fdType VARCHAR(10) DEFAULT "";
        DECLARE acBalance NUMERIC(12,2) DEFAULT 0.00;

        DECLARE bdone INT;

        DECLARE curs CURSOR FOR SELECT distinct number,amount,plan FROM fixed_deposit;
        DECLARE CONTINUE HANDLER FOR NOT FOUND SET bdone = 1;

        OPEN curs;

        SET bdone=0;
        REPEAT
            FETCH curs INTO num,fdAmount,fdType;
            SELECT balance INTO acBalance FROM account WHERE number = num;

            IF fdType = '1y' THEN
                SET acBalance = acBalance + fdAmount * 0.14 / 12;
            ELSEIF fdType = '3y' THEN
                SET acBalance = acBalance + fdAmount * 0.15 / 12;
            ELSEIF fdType = '6m' THEN
                SET acBalance = acBalance + fdAmount * 0.13 / 12;
            END IF;
            
            START TRANSACTION;
            UPDATE account SET balance = acBalance WHERE number = num;
            COMMIT;

        UNTIL bdone END REPEAT;
        CLOSE curs;
    
    
    END`);

    database.query(`INSERT INTO area VALUES(1, "Colombo");`);
    database.query(`INSERT INTO area VALUES(2, "Moratuwa");`);
    database.query(`INSERT INTO area VALUES(3, "Wattala");`);
    database.query(`INSERT INTO area VALUES(4, "Kelaniya");`);
    database.query(`INSERT INTO area VALUES(5, "Ragama");`);
    database.query(`INSERT INTO area VALUES(6, "Maharagama");`);
    database.query(`INSERT INTO area VALUES(7, "Jaela");`);
    database.query(`INSERT INTO area VALUES(8, "Homagama");`);
    database.query(`INSERT INTO area VALUES(9, "Kottawa");`);
    database.query(`INSERT INTO area VALUES(10, "Kotte");`);

    database.query(`INSERT INTO agent VALUES("150F", "Oshanath", ?, 1);`, [hash("osh")]);
    database.query(`INSERT INTO agent VALUES("654T", "Thilina", ?, 2);`, [hash("thi")]);
    database.query(`INSERT INTO agent VALUES("132W", "Gamunu", ?, 3);`, [hash("gam")]);
    database.query(`INSERT INTO agent VALUES("450U", "Pasan" , ?, 4);`, [hash("pas")]);
    database.query(`INSERT INTO agent VALUES("220K", "Hirusha", ?, 5);`, [hash("hire")]);
    database.query(`INSERT INTO agent VALUES("111G", "Sampath", ?, 6);`, [hash("sam")]);
    database.query(`INSERT INTO agent VALUES("210F", "Lasantha" , ?, 7);`, [hash("lai")]);
    database.query(`INSERT INTO agent VALUES("189X", "Duleep", ?, 8);`, [hash("dup")]);
    database.query(`INSERT INTO agent VALUES("400Z", "Ganga", ?, 9);`, [hash("gag")]);
    database.query(`INSERT INTO agent VALUES("750R", "Ravindu", ?, 10);`, [hash("rar")]);

    // ------------------------Accounts--------------------------------------------------------------
    database.query(`INSERT INTO account VALUES(1112345, 45000.00, "Adult")`);
    database.query(`INSERT INTO account VALUES(1225574, 64000.00, "Joint")`);
    database.query(`INSERT INTO account VALUES(1113544, 34000.00, "Senior")`);
    database.query(`INSERT INTO account VALUES(1002541, 67000.00, "Child")`);
    database.query(`INSERT INTO account VALUES(2456899, 76000.00, "Adult")`);

    database.query(`INSERT INTO account VALUES(5666320, 48000.00, "Joint")`);
    database.query(`INSERT INTO account VALUES(5638265, 64000.00, "Adult")`);
    database.query(`INSERT INTO account VALUES(1223346, 99000.00, "Senior")`);
    database.query(`INSERT INTO account VALUES(3746887, 67000.00, "Adult")`);
    database.query(`INSERT INTO account VALUES(2311556, 76000.00, "Teen")`);

    database.query(`INSERT INTO account VALUES(3346231, 87000.00, "Adult")`);
    database.query(`INSERT INTO account VALUES(3723113, 44000.00, "Teen")`);
    database.query(`INSERT INTO account VALUES(4532557, 48000.00, "Joint")`);
    database.query(`INSERT INTO account VALUES(6632222, 65000.00, "Adult")`);
    database.query(`INSERT INTO account VALUES(2321678, 75000.00, "Adult")`);

    database.query(`INSERT INTO account VALUES(8589953, 33000.00, "Adult")`);
    database.query(`INSERT INTO account VALUES(2114886, 35000.00, "Child")`);
    database.query(`INSERT INTO account VALUES(5029611, 566000.00, "Adult")`);
    database.query(`INSERT INTO account VALUES(9021001, 97000.00, "Teen")`);
    database.query(`INSERT INTO account VALUES(1202009, 77000.00, "Child")`);

    database.query(`INSERT INTO account VALUES(8769199, 57000.00, "Adult")`);
    database.query(`INSERT INTO account VALUES(6328671, 46000.00, "Adult")`);
    database.query(`INSERT INTO account VALUES(2762346, 54000.00, "Adult")`);
    database.query(`INSERT INTO account VALUES(2638228, 67000.00, "Teen")`);
    database.query(`INSERT INTO account VALUES(6773920, 99000.00, "Adult")`);

    database.query(`INSERT INTO account VALUES(8342064, 200000.00, "Senior")`);
    database.query(`INSERT INTO account VALUES(3629026, 22000.00, "Senior")`);
    database.query(`INSERT INTO account VALUES(7290623, 166000.00, "Teen")`);
    database.query(`INSERT INTO account VALUES(9030221, 655000.00, "Adult")`);
    database.query(`INSERT INTO account VALUES(5029684, 85000.00, "Child")`);

    database.query(`INSERT INTO account VALUES(2039454, 63000.00, "Adult")`);
    database.query(`INSERT INTO account VALUES(1139749, 37000.00, "Senior")`);
    database.query(`INSERT INTO account VALUES(1394233, 69000.00, "Child")`);
    database.query(`INSERT INTO account VALUES(1389002, 75000.00, "Adult")`);
    database.query(`INSERT INTO account VALUES(3201044, 35000.00, "Joint")`);

    database.query(`INSERT INTO account VALUES(5932012, 25000.00, "Teen")`);
    database.query(`INSERT INTO account VALUES(1839453, 27000.00, "Senior")`);
    database.query(`INSERT INTO account VALUES(7623112, 144000.00, "Adult")`);
    database.query(`INSERT INTO account VALUES(2231091, 99000.00, "Adult")`);
    database.query(`INSERT INTO account VALUES(1023637, 16000.00, "Child")`);

    database.query(`INSERT INTO account VALUES(3222432, 4000.00, "Joint")`);
    database.query(`INSERT INTO account VALUES(2199211, 455000.00, "Senior")`);
    database.query(`INSERT INTO account VALUES(7236500, 66000.00, "Senior")`);
    database.query(`INSERT INTO account VALUES(1023739, 27000.00, "Adult")`);
    database.query(`INSERT INTO account VALUES(7192305, 54000.00, "Teen")`);

    database.query(`INSERT INTO account VALUES(5192021, 45000.00, "Adult")`);
    database.query(`INSERT INTO account VALUES(7443216, 64000.00, "Joint")`);
    database.query(`INSERT INTO account VALUES(6002123, 34000.00, "Adult")`);
    database.query(`INSERT INTO account VALUES(2903480, 67000.00, "Adult")`);
    database.query(`INSERT INTO account VALUES(2346575, 76000.00, "Senior")`);

    database.query(`INSERT INTO account VALUES(1124677, 33000.00, "Adult")`);
    database.query(`INSERT INTO account VALUES(2346441, 44000.00, "Adult")`);
    database.query(`INSERT INTO account VALUES(7261291, 4000.00, "Adult")`);
    database.query(`INSERT INTO account VALUES(1735103, 668000.00, "Adult")`);
    database.query(`INSERT INTO account VALUES(3487520, 900000.00, "Adult")`);
    database.query(`INSERT INTO account VALUES(2340587, 56000.00, "Senior")`);

    // ---------------------------Customers--------------------------------------------------------------

    database.query(`INSERT INTO customer VALUES("199824872316", "Lasith", 1);`);
    database.query(`INSERT INTO customer VALUES("872681325v", "Ravindu", 6);`);
    database.query(`INSERT INTO customer VALUES("755290243v", "Kalani", 4);`);
    database.query(`INSERT INTO customer VALUES("651741135v", "Sunil", 7);`);
    database.query(`INSERT INTO customer VALUES("196727006738", "akash", 5);`);

    database.query(`INSERT INTO customer VALUES("751266732v", "Tharusha", 6);`);
    database.query(`INSERT INTO customer VALUES("778452259v", "Priyantha", 9);`);
    database.query(`INSERT INTO customer VALUES("199262003751", "Sanduni", 1);`);
    database.query(`INSERT INTO customer VALUES("198240001893", "Madhawa", 3);`);
    database.query(`INSERT INTO customer VALUES("628345774v", "lakshani", 9);`);

    database.query(`INSERT INTO customer VALUES("693475692v", "Isuru", 9);`);
    database.query(`INSERT INTO customer VALUES("197838475455", "Kanishka", 2);`);
    database.query(`INSERT INTO customer VALUES("917456928v", "Charitha", 5);`);
    database.query(`INSERT INTO customer VALUES("198739824945", "Hasarangi", 2);`);
    database.query(`INSERT INTO customer VALUES("597817365v", "Gayan", 4);`);

    database.query(`INSERT INTO customer VALUES("196782347534", "Kasun", 7);`);
    database.query(`INSERT INTO customer VALUES("983475294v", "Fathima", 10);`);
    database.query(`INSERT INTO customer VALUES("877903485v", "asantha", 7);`);
    database.query(`INSERT INTO customer VALUES("761981729v", "Vinuri", 9);`);
    database.query(`INSERT INTO customer VALUES("830185154v", "Avishka", 8);`);

    database.query(`INSERT INTO customer VALUES("55666336v", "Erandi", 4);`);
    database.query(`INSERT INTO customer VALUES("197989103573", "Akila", 8);`);
    database.query(`INSERT INTO customer VALUES("197629346913", "Wenuka ", 7);`);
    database.query(`INSERT INTO customer VALUES("246774774v", "Thilini", 3);`);
    database.query(`INSERT INTO customer VALUES("23246547747", "Kalana", 3);`);

    database.query(`INSERT INTO customer VALUES("4446646778", "Dulanji", 8);`);
    database.query(`INSERT INTO customer VALUES("24647466v", "Eshan", 6);`);
    database.query(`INSERT INTO customer VALUES("198719843579", "Ravindi", 1);`);
    database.query(`INSERT INTO customer VALUES("619123642v", "Bimsara", 8);`);
    database.query(`INSERT INTO customer VALUES("588735413v", "Praveen", 7);`);

    database.query(`INSERT INTO customer VALUES("24466747v", "Hasindri", 7);`);
    database.query(`INSERT INTO customer VALUES("1778906884", "Sakuni", 4);`);
    database.query(`INSERT INTO customer VALUES("246793333", "Dinuka", 8);`);
    database.query(`INSERT INTO customer VALUES("198891826351", "Ahmed", 3);`);
    database.query(`INSERT INTO customer VALUES("196189823453", "Ovini", 9);`);

    database.query(`INSERT INTO customer VALUES("832948923v", "Sasini", 10);`);
    database.query(`INSERT INTO customer VALUES("77868555v", "Thisara", 6);`);
    database.query(`INSERT INTO customer VALUES("247774789v", "Harsha", 6);`);
    database.query(`INSERT INTO customer VALUES("95563377v", "Induwari", 6);`);
    database.query(`INSERT INTO customer VALUES("46678447v", "Pasindu", 1);`);
    database.query(`INSERT INTO customer VALUES("639126358v", "Banuka", 5);`);

    // --------------------------Manager----------------------------------------------------------------

    database.query(`INSERT INTO manager VALUES("root", ?)`, [hash("roots")]);

    // -----------------------Account customer----------------------------------------------------------

    database.query(`INSERT INTO account_customer VALUES(1112345, "199824872316");`);
    database.query(`INSERT INTO account_customer VALUES(1225574, "872681325v");`);
    database.query(`INSERT INTO account_customer VALUES(1225574, "755290243v");`);
    database.query(`INSERT INTO account_customer VALUES(1113544, "651741135v");`);
    database.query(`INSERT INTO account_customer VALUES(1002541, "196727006738");`);

    database.query(`INSERT INTO account_customer VALUES(2456899, "751266732v");`);
    database.query(`INSERT INTO account_customer VALUES(5666320, "778452259v");`);
    database.query(`INSERT INTO account_customer VALUES(5666320, "199262003751");`);
    database.query(`INSERT INTO account_customer VALUES(5638265, "198240001893");`);
    database.query(`INSERT INTO account_customer VALUES(1223346, "628345774v");`);

    database.query(`INSERT INTO account_customer VALUES(3746887, "693475692v");`);
    database.query(`INSERT INTO account_customer VALUES(2311556, "197838475455");`);
    database.query(`INSERT INTO account_customer VALUES(3346231, "917456928v");`);
    database.query(`INSERT INTO account_customer VALUES(3723113, "198739824945");`);
    database.query(`INSERT INTO account_customer VALUES(4532557, "597817365v");`);

    database.query(`INSERT INTO account_customer VALUES(4532557, "196782347534");`);
    database.query(`INSERT INTO account_customer VALUES(6632222, "983475294v");`);
    database.query(`INSERT INTO account_customer VALUES(8589953, "761981729v");`);
    database.query(`INSERT INTO account_customer VALUES(2114886, "830185154v");`);
    database.query(`INSERT INTO account_customer VALUES(5029611, "55666336v");`);

    database.query(`INSERT INTO account_customer VALUES(9021001, "197989103573");`);
    database.query(`INSERT INTO account_customer VALUES(1202009, "197629346913");`);
    database.query(`INSERT INTO account_customer VALUES(8769199, "246774774v");`);
    database.query(`INSERT INTO account_customer VALUES(6328671, "23246547747");`);
    database.query(`INSERT INTO account_customer VALUES(2762346, "4446646778");`);

    database.query(`INSERT INTO account_customer VALUES(2638228, "24647466v");`);
    database.query(`INSERT INTO account_customer VALUES(6773920, "198719843579");`);
    database.query(`INSERT INTO account_customer VALUES(8342064, "619123642v");`);
    database.query(`INSERT INTO account_customer VALUES(3629026, "588735413v");`);
    database.query(`INSERT INTO account_customer VALUES(7290623, "24466747v");`);

    database.query(`INSERT INTO account_customer VALUES(9030221, "1778906884");`);
    database.query(`INSERT INTO account_customer VALUES(5029684, "246793333");`);
    database.query(`INSERT INTO account_customer VALUES(2039454, "198891826351");`);
    database.query(`INSERT INTO account_customer VALUES(1139749, "196189823453");`);
    database.query(`INSERT INTO account_customer VALUES(1394233, "832948923v");`);

    database.query(`INSERT INTO account_customer VALUES(1389002, "77868555v");`);
    database.query(`INSERT INTO account_customer VALUES(3201044, "247774789v");`);
    database.query(`INSERT INTO account_customer VALUES(3201044, "95563377v");`);
    database.query(`INSERT INTO account_customer VALUES(5932012, "46678447v");`);
    database.query(`INSERT INTO account_customer VALUES(1839453, "639126358v");`);

    database.query(`INSERT INTO account_customer VALUES(7623112, "199824872316");`);
    database.query(`INSERT INTO account_customer VALUES(2231091, "755290243v");`);
    database.query(`INSERT INTO account_customer VALUES(1023637, "196727006738");`);
    database.query(`INSERT INTO account_customer VALUES(3222432, "751266732v");`);
    database.query(`INSERT INTO account_customer VALUES(3222432, "778452259v");`);

    database.query(`INSERT INTO account_customer VALUES(2199211, "628345774v");`);
    database.query(`INSERT INTO account_customer VALUES(7236500, "597817365v");`);
    database.query(`INSERT INTO account_customer VALUES(1023739, "877903485v");`);
    database.query(`INSERT INTO account_customer VALUES(7192305, "197989103573");`);
    database.query(`INSERT INTO account_customer VALUES(5192021, "23246547747");`);

    database.query(`INSERT INTO account_customer VALUES(7443216, "619123642v");`);
    database.query(`INSERT INTO account_customer VALUES(7443216, "588735413v");`);
    database.query(`INSERT INTO account_customer VALUES(6002123, "1778906884");`);
    database.query(`INSERT INTO account_customer VALUES(2903480, "247774789v");`);
    database.query(`INSERT INTO account_customer VALUES(2346575, "639126358v");`);

    database.query(`INSERT INTO account_customer VALUES(1124677, "778452259v");`);
    database.query(`INSERT INTO account_customer VALUES(2346441, "877903485v");`);
    database.query(`INSERT INTO account_customer VALUES(7261291, "23246547747");`);
    database.query(`INSERT INTO account_customer VALUES(1735103, "1778906884");`);
    database.query(`INSERT INTO account_customer VALUES(3487520, "247774789v");`);
    database.query(`INSERT INTO account_customer VALUES(2340587, "639126358v");`);

    // ----------------------Account registered---------------------------------------------------------------

    database.query(`INSERT INTO account_registered VALUES(1112345, true)`);
    database.query(`INSERT INTO account_registered VALUES(1225574, true)`);
    database.query(`INSERT INTO account_registered VALUES(1113544, true)`);
    database.query(`INSERT INTO account_registered VALUES(2456899, false)`);
    database.query(`INSERT INTO account_registered VALUES(5666320, true)`);
    database.query(`INSERT INTO account_registered VALUES(5638265, false)`);

    database.query(`INSERT INTO account_registered VALUES(1223346, true)`);
    database.query(`INSERT INTO account_registered VALUES(3746887, false)`);
    database.query(`INSERT INTO account_registered VALUES(3346231, false)`);
    database.query(`INSERT INTO account_registered VALUES(4532557, true)`);
    database.query(`INSERT INTO account_registered VALUES(6632222, false)`);
    database.query(`INSERT INTO account_registered VALUES(2321678, true)`);

    database.query(`INSERT INTO account_registered VALUES(8589953, false)`);
    database.query(`INSERT INTO account_registered VALUES(5029611, true)`);
    database.query(`INSERT INTO account_registered VALUES(8769199, true)`);
    database.query(`INSERT INTO account_registered VALUES(6328671, true)`);
    database.query(`INSERT INTO account_registered VALUES(2762346, false)`);
    database.query(`INSERT INTO account_registered VALUES(6773920, false)`);

    database.query(`INSERT INTO account_registered VALUES(8342064, true)`);
    database.query(`INSERT INTO account_registered VALUES(3629026, false)`);
    database.query(`INSERT INTO account_registered VALUES(9030221, false)`);
    database.query(`INSERT INTO account_registered VALUES(2039454, true)`);
    database.query(`INSERT INTO account_registered VALUES(1139749, true)`);
    database.query(`INSERT INTO account_registered VALUES(1389002, true)`);

    database.query(`INSERT INTO account_registered VALUES(1839453, false)`);
    database.query(`INSERT INTO account_registered VALUES(7623112, false)`);
    database.query(`INSERT INTO account_registered VALUES(2231091, true)`);
    database.query(`INSERT INTO account_registered VALUES(3222432, false)`);
    database.query(`INSERT INTO account_registered VALUES(2199211, true)`);
    database.query(`INSERT INTO account_registered VALUES(7236500, true)`);

    database.query(`INSERT INTO account_registered VALUES(1023739, false)`);
    database.query(`INSERT INTO account_registered VALUES(5192021, false)`);
    database.query(`INSERT INTO account_registered VALUES(7443216, true)`);
    database.query(`INSERT INTO account_registered VALUES(6002123, true)`);
    database.query(`INSERT INTO account_registered VALUES(2903480, true)`);
    database.query(`INSERT INTO account_registered VALUES(2346575, true)`);

    database.query(`INSERT INTO account_registered VALUES(1124677, false)`);
    database.query(`INSERT INTO account_registered VALUES(2346441, true)`);
    database.query(`INSERT INTO account_registered VALUES(7261291, false)`);
    database.query(`INSERT INTO account_registered VALUES(1735103, true)`);
    database.query(`INSERT INTO account_registered VALUES(3487520, true)`);
    database.query(`INSERT INTO account_registered VALUES(2340587, true)`);

    // ---------------------------Account critical------------------------------------------------------

    database.query(`INSERT INTO account_critical VALUES(1112345, false);`);
    database.query(`INSERT INTO account_critical VALUES(1113544, true);`);
    database.query(`INSERT INTO account_critical VALUES(1223346, false);`);
    database.query(`INSERT INTO account_critical VALUES(2321678, true);`);
    database.query(`INSERT INTO account_critical VALUES(5029611, true);`);
    
    database.query(`INSERT INTO account_critical VALUES(8769199, false);`);
    database.query(`INSERT INTO account_critical VALUES(6328671, false);`);
    database.query(`INSERT INTO account_critical VALUES(8342064, false);`);
    database.query(`INSERT INTO account_critical VALUES(2039454, false);`);
    database.query(`INSERT INTO account_critical VALUES(1139749, true);`);
    database.query(`INSERT INTO account_critical VALUES(1389002, true);`);

    database.query(`INSERT INTO account_critical VALUES(2231091, false);`);
    database.query(`INSERT INTO account_critical VALUES(2199211, true);`);
    database.query(`INSERT INTO account_critical VALUES(7236500, false);`);
    database.query(`INSERT INTO account_critical VALUES(6002123, true);`);
    database.query(`INSERT INTO account_critical VALUES(2903480, true);`);
    database.query(`INSERT INTO account_critical VALUES(2346575, true);`);

    database.query(`INSERT INTO account_critical VALUES(2346441, true);`);
    database.query(`INSERT INTO account_critical VALUES(1735103, false);`);
    database.query(`INSERT INTO account_critical VALUES(3487520, true);`);
    database.query(`INSERT INTO account_critical VALUES(2340587, false);`);

    // ---------------------------------------------------------------------------

    database.query(`INSERT INTO account_pin VALUES(1112345, ?)`, [hash("984")]);
    database.query(`INSERT INTO account_pin VALUES(1225574, ?)`, [hash("995")]);
    database.query(`INSERT INTO account_pin VALUES(1113544, ?)`, [hash("846")]);
    database.query(`INSERT INTO account_pin VALUES(5666320, ?)`, [hash("154")]);
    database.query(`INSERT INTO account_pin VALUES(1223346, ?)`, [hash("956")]);

    database.query(`INSERT INTO account_pin VALUES(4532557, ?)`, [hash("259")]);
    database.query(`INSERT INTO account_pin VALUES(2321678, ?)`, [hash("938")]);
    database.query(`INSERT INTO account_pin VALUES(5029611, ?)`, [hash("693")]);
    database.query(`INSERT INTO account_pin VALUES(8769199, ?)`, [hash("587")]);
    database.query(`INSERT INTO account_pin VALUES(6328671, ?)`, [hash("360")]);

    database.query(`INSERT INTO account_pin VALUES(8342064, ?)`, [hash("773")]);
    database.query(`INSERT INTO account_pin VALUES(2039454, ?)`, [hash("423")]);
    database.query(`INSERT INTO account_pin VALUES(1139749, ?)`, [hash("590")]);
    database.query(`INSERT INTO account_pin VALUES(1389002, ?)`, [hash("499")]);
    database.query(`INSERT INTO account_pin VALUES(2231091, ?)`, [hash("938")]);

    database.query(`INSERT INTO account_pin VALUES(2199211, ?)`, [hash("861")]);
    database.query(`INSERT INTO account_pin VALUES(7236500, ?)`, [hash("505")]);
    database.query(`INSERT INTO account_pin VALUES(7443216, ?)`, [hash("267")]);
    database.query(`INSERT INTO account_pin VALUES(6002123, ?)`, [hash("858")]);
    database.query(`INSERT INTO account_pin VALUES(2903480, ?)`, [hash("748")]);

    database.query(`INSERT INTO account_pin VALUES(2346575, ?)`, [hash("906")]);
    database.query(`INSERT INTO account_pin VALUES(2346441, ?)`, [hash("366")]);
    database.query(`INSERT INTO account_pin VALUES(1735103, ?)`, [hash("983")]);
    database.query(`INSERT INTO account_pin VALUES(3487520, ?)`, [hash("354")]);
    database.query(`INSERT INTO account_pin VALUES(2340587, ?)`, [hash("647")]);

    // ---------------------------------------------------------------------------------------
    

    //database.query("CALL calculateInterests();");

    database.query(`
    CREATE EVENT add_savings_interests
    ON SCHEDULE EVERY 1 MONTH
    STARTS '2022-07-01 00:00:00'
    DO
        CALL calculateInterests();
    `);
   
    database.query(`
    CREATE EVENT add_fd_interests
    ON SCHEDULE EVERY 1 MONTH
    STARTS '2022-07-01 00:00:00'
    DO
        CALL calFDInterests();
    `);
   
}

module.exports = {
    createConnection,
    dropTablesAndInsertDummyData,
    hash,
    compareHash
};
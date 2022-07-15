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
    database.query(`DROP TABLE IF EXISTS account_customer;`);
    database.query(`DROP TABLE IF EXISTS account_registered;`);
    database.query(`DROP TABLE IF EXISTS account_critical;`);
    database.query(`DROP TABLE IF EXISTS account_pin`);
    database.query(`DROP TABLE IF EXISTS fixed_deposit;`);
    database.query(`DROP TABLE IF EXISTS transactions;`);
    database.query(`DROP TABLE IF EXISTS account;`);
    database.query(`DROP TABLE IF EXISTS customer;`);
    database.query(`DROP TABLE IF EXISTS agent;`);
    database.query(`DROP TABLE IF EXISTS area`);

    database.query(`DROP TABLE IF EXISTS manager;`)

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
        password VARCHAR(50) NOT NULL, 
        code INT,
        PRIMARY KEY (agentID),
        FOREIGN KEY(code) REFERENCES area(code)
    );`);
        
    database.query(`CREATE TABLE customer(
        nic VARCHAR(20), 
        name VARCHAR(50) NOT NULL, 
        agentID VARCHAR(20) NOT NULL,
        PRIMARY KEY (nic), 
        FOREIGN KEY (agentID) references agent(agentID)
    );`);
        
    database.query(`CREATE TABLE account_customer(
        number INT, 
        nic VARCHAR(20), 
        FOREIGN KEY (number) REFERENCES account(number), 
        FOREIGN KEY (nic) REFERENCES customer(nic)
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
        FOREIGN KEY (agentID) REFERENCES agent(agentID),
        FOREIGN KEY (number) REFERENCES account(number)
    )`);
        
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
                set bal = bal + bal * 0.12;
            ELSEIF acType = 'teen' AND bal >= 500 THEN
                set bal = bal + bal * 0.11;
            ELSEIF acType = 'adult' AND bal >= 1000 THEN
                set bal = bal + bal * 0.1;
            ELSEIF acType = 'senior' AND bal >= 1000 THEN
                set bal = bal + bal * 0.13;
            ELSEIF acType = 'joint' AND bal >= 5000 THEN
                set bal = bal + bal * 0.07;
            END IF;
            START TRANSACTION;
            UPDATE account SET balance = bal WHERE number = num;
            COMMIT;
                
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

    database.query(`INSERT INTO account VALUES (12332555, 45666.56, "joint");`);
    database.query(`INSERT INTO account VALUES (65468467, 45666.56, "joint");`);
    database.query(`INSERT INTO account VALUES (34635764, 45666.56, "child");`);
    database.query(`INSERT INTO account VALUES (33455546, 45666.56, "child");`);
    database.query(`INSERT INTO account VALUES (85469699, 45666.56, "adult");`);
    database.query(`INSERT INTO account VALUES (45673858, 45666.56, "teen");`);
    database.query(`INSERT INTO account VALUES (09887755, 45666.56, "teen");`);
    database.query(`INSERT INTO account VALUES (16683568, 45666.56, "adult");`);
    database.query(`INSERT INTO account VALUES (23580987, 45666.56, "adult");`);
    database.query(`INSERT INTO account VALUES (10885446, 45666.56, "adult");`);
    database.query(`INSERT INTO account VALUES (65584445, 45666.56, "senior");`);
    database.query(`INSERT INTO account VALUES (78654555, 45666.56, "senior");`);

    database.query(`INSERT INTO account_registered VALUES(12332555, true);`);
    database.query(`INSERT INTO account_registered VALUES(65468467, true);`);
    database.query(`INSERT INTO account_registered VALUES(85469699, true);`);
    database.query(`INSERT INTO account_registered VALUES(16683568, true);`);
    database.query(`INSERT INTO account_registered VALUES(23580987, true);`);
    database.query(`INSERT INTO account_registered VALUES(10885446, true);`);
    database.query(`INSERT INTO account_registered VALUES(65584445, false);`);
    database.query(`INSERT INTO account_registered VALUES(78654555, false);`);

    database.query(`INSERT INTO area VALUES(1, "Nugegoda")`);
    database.query(`INSERT INTO area VALUES(2, "Moratuwa")`);
    
    database.query("INSERT INTO agent VALUES(\"190488J\", \"Oshanath\", \"password\", 1);");
    database.query("INSERT INTO agent VALUES(\"190564L\", \"Rajawasam\", \"password\", 2);");

    database.query("INSERT INTO customer VALUES(\"991741135v\", \"Lasith\", \"190488J\");");
    database.query("INSERT INTO customer VALUES(\"246757377f\", \"Ravindu\", \"190488J\");");
    database.query("INSERT INTO customer VALUES(\"34634g575jj\", \"Thilina\", \"190564L\");");
    database.query("INSERT INTO customer VALUES(\"rsgrrd44646\", \"Madaya\", \"190564L\");");

    database.query("INSERT INTO account_customer VALUES(12332555, \"991741135v\");"); // joint lasith ravindu
    database.query("INSERT INTO account_customer VALUES(12332555, \"246757377f\");"); // joint lasith ravindu
    database.query("INSERT INTO account_customer VALUES(65468467, \"991741135v\");");
    database.query("INSERT INTO account_customer VALUES(34635764, \"991741135v\");");
    database.query("INSERT INTO account_customer VALUES(33455546, \"246757377f\");");
    database.query("INSERT INTO account_customer VALUES(45673858, \"246757377f\");");
    database.query("INSERT INTO account_customer VALUES(09887755, \"34634g575jj\");");
    database.query("INSERT INTO account_customer VALUES(09887755, \"rsgrrd44646\");");
    database.query("INSERT INTO account_customer VALUES(10885446, \"rsgrrd44646\");");

    database.query("INSERT INTO account_critical VALUES(12332555, true);");
    database.query("INSERT INTO account_critical VALUES(34635764, false);");
    database.query("INSERT INTO account_critical VALUES(33455546, false);");
    database.query("INSERT INTO account_critical VALUES(85469699, true);");
    database.query("INSERT INTO account_critical VALUES(45673858, false);");
    database.query("INSERT INTO account_critical VALUES(09887755, false);");
    database.query("INSERT INTO account_critical VALUES(16683568, false);");
    database.query("INSERT INTO account_critical VALUES(23580987, true);");
    database.query("INSERT INTO account_critical VALUES(10885446, false);");

    database.query(`INSERT INTO account_pin VALUES(10885446, ?)`, [hash("1234")]);
    database.query(`INSERT INTO account_pin VALUES(12332555, ?)`, [hash("5678")]);
    database.query(`INSERT INTO account_pin VALUES(65468467, ?)`, [hash("9101")]);
    database.query(`INSERT INTO account_pin VALUES(85469699, ?)`, [hash("6447")]);
    database.query(`INSERT INTO account_pin VALUES(16683568, ?)`, [hash("4545")]);
    database.query(`INSERT INTO account_pin VALUES(23580987, ?)`, [hash("9000")]);
    database.query(`INSERT INTO account_pin VALUES(45673858, ?)`, [hash("1212")]);

    database.query(`INSERT INTO manager VALUES("root", ?)`, [hash("roots")]);

    database.query(`INSERT INTO transactions VALUES(12332555, "w", 12000.00, "2022-05-13 11:23:45", "190488J")`);
    database.query(`INSERT INTO transactions VALUES(65468467, "d", 14000.00, "2022-03-15 11:23:45", "190488J")`);
    database.query(`INSERT INTO transactions VALUES(12332555, "w", 17000.00, "2021-03-13 11:23:45", "190488J")`);
    database.query(`INSERT INTO transactions VALUES(65468467, "d", 122000.00, "2021-03-15 11:23:45", "190488J")`);

    database.query("CALL calculateInterests();");

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
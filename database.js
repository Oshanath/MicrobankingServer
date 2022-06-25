const mysql = require('mysql');
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

async function countAccounts() {
    var a;
    database.query("SELECT count(*) from account;",
        (err, result) => {
            //console.log(result);
            a = result[0][`count(*)`];
            return a;
        });

    return a;
}

async function calculateInterests() {

    let numberOFAcoounts;
    database.query("SELECT count(*) from account;",
        (err, result) => {
            numberOFAcoounts = result[0][`count(*)`];

            database.query(`SELECT number,balance from account;`,
                (err, resultAllAccounts) => {
                    for (let i = 0; i < numberOFAcoounts; i++) {
                        let balance;
                        let num;
                        balance = resultAllAccounts[i][`balance`];
                        num = resultAllAccounts[i][`number`];
                        if (balance >= 500) {
                            balance += balance * 0.12;
                        } else if (balance >= 1000) {
                            balance += balance * 0.1;
                        } else if (balance >= 1000) {
                            balance += balance * 0.13;
                        } else if (balance >= 5000) {
                            balance += balance * 0.07;
                        }
                        
                        database.query(`UPDATE account SET balance = ${balance} where number = ${num} `);

                    }

                });

        });





}

function dropTablesAndInsertDummyData() {
    database.query("DROP TABLE IF EXISTS account_customer");
    database.query("DROP TABLE IF EXISTS account");
    database.query("DROP TABLE IF EXISTS customer");
    database.query("DROP TABLE IF EXISTS agent");
    database.query("DROP TABLE IF EXISTS account_critical");

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

    calculateInterests();
}



module.exports = {
    createConnection,
    dropTablesAndInsertDummyData
};
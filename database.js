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
                        if(!acType.localeCompare(`child`)){
                            balance += balance * 0.12;
                            //console.log(balance);
                        }else if (!acType.localeCompare(`teen`) && balance >= 500) {
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
    database.query("DROP TABLE IF EXISTS account_customer");
    database.query("DROP TABLE IF EXISTS account_registered");
    database.query("DROP TABLE IF EXISTS account");
    database.query("DROP TABLE IF EXISTS customer");
    database.query("DROP TABLE IF EXISTS agent");
    database.query("DROP TABLE IF EXISTS account_critical");

    database.query("CREATE TABLE account(number INT, balance FLOAT NOT NULL, type VARCHAR(10) NOT NULL, PRIMARY KEY (number));");
    database.query("CREATE TABLE agent(agentID VARCHAR(20), name VARCHAR(50) NOT NULL, password VARCHAR(50) NOT NULL, PRIMARY KEY (agentID));");
    database.query("CREATE TABLE customer(nic VARCHAR(20), name VARCHAR(50) NOT NULL, agentID VARCHAR(20) NOT NULL, PRIMARY KEY (nic), FOREIGN KEY (agentID) references agent(agentID));");
    database.query("CREATE TABLE account_customer(number INT, nic VARCHAR(20), FOREIGN KEY (number) REFERENCES account(number), FOREIGN KEY (nic) REFERENCES customer(nic));");
    database.query("CREATE TABLE account_critical(number INT, critical BOOLEAN);");
    database.query("CREATE TABLE account_registered(number INT, registered BOOLEAN NOT NULL, FOREIGN KEY (number) REFERENCES account(number));");

    // Functions and procedures

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

    database.query("INSERT INTO agent VALUES(\"190488J\", \"Oshanath\", \"password\");");
    database.query("INSERT INTO agent VALUES(\"190564L\", \"Rajawasam\", \"password\");");

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

    database.query("INSERT INTO account_critical VALUES(12332555, true);");
    database.query("INSERT INTO account_critical VALUES(34635764, false);");
    database.query("INSERT INTO account_critical VALUES(33455546, false);");
    database.query("INSERT INTO account_critical VALUES(85469699, true);");
    database.query("INSERT INTO account_critical VALUES(45673858, false);");
    database.query("INSERT INTO account_critical VALUES(09887755, false);");
    database.query("INSERT INTO account_critical VALUES(16683568, false);");
    database.query("INSERT INTO account_critical VALUES(23580987, true);");
    database.query("INSERT INTO account_critical VALUES(10885446, false);");

    
}



module.exports = {
    createConnection,
    dropTablesAndInsertDummyData
};
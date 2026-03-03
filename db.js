const mysql = require('mysql2');

// Create the connection to the database
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',      // Your MySQL username (usually root)
  password: 'Sarngi@1524', // Enter your MySQL Workbench password here
  database: 'restaurant_db'
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database: ' + err.stack);
    return;
  }
  console.log('Connected to MySQL database as id ' + connection.threadId);
});

module.exports = connection;
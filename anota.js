var http = require("http"),
    url  = require("url"),
    formidable = require("formidable"),
    querystring = require("querystring"),
    json2html = require("node-json2html"),
    path = require("path"),
    fs   = require("fs"),
    mysql= require("mysql"),
    port = process.env.PORT || 8888; // Variable name must be PORT in ACCS

var connection;
if (process.env.MYSQLCS_CONNECT_STRING == null) {
  connection = mysql.createConnection({
    host     : 'localhost',
    port     : '4000',
    user     : 'mess',
    password : 'MESS4ever!',
    database : 'mess',
    multipleStatements : true
  })} else {
  connection = mysql.createConnection({
    host     : url.parse("mysql://"+process.env.MYSQLCS_CONNECT_STRING).hostname,
    port     : process.env.MYSQLCS_MYSQL_PORT,
    user     : process.env.MYSQLCS_USER_NAME,
    password : process.env.MYSQLCS_USER_PASSWORD,
    database : 'anota',
    multipleStatements : true
  });}


http.createServer(server).listen(parseInt(port, 10));
console.log("MESS server running at\n  => http://localhost:" + port + "/\nCTRL + C to shutdown");
connection.connect(function(err){if(err) console.log("Error connecting database\n"+err);});


// End of MAIN


//
// function server is the main http server routine. It checks the selected URL and calls the corresponding function
//
function server(request, response) {
    var key = url.parse(request.url).pathname.substr(1);
    if(key == "")
        startpage(response);
    else if(key == "register.mess")
        register(request, response);
    else if (key=="report.mess")
        report(request, response);
    else
        forward(request, response, key);
}


//
// function startpage outputs the file startpage.mess. 
// This page contains static data and a form to register new shortcuts
//
function startpage(response) {

    var filename = path.join(process.cwd(),"startpage.mess");
    fs.readFile(filename, "binary", function(err,file) {
    response.writeHead(200);
    response.write(file, "binary");
    response.end();
    });
}


//
// function register is called from the submit action of the startpage form.
// It receives two fields and creates an INSERT statement from that.
// 
function register(request, response) {
    var form = new formidable.IncomingForm();
    form.parse(request, function(err, fields, files) {
      if (err) errorpage(request, response, err);
      else {
	var insert="INSERT INTO shortcut_url (url,shortcut) VALUES('"+fields.url+"','"+fields.shortcut+"')";
        connection.query(insert, function(err, rows, fields) {
        if (err) errorpage(request, response, err);
        else {
            response.writeHead(200);
            response.write("Data written: "+insert, "binary");
            response.end();
        }});
      }
    });
}


//
// function report displays a page with four items:
// 1. The total number of stored shortcuts in the database
// 2. A form to query one individual shortcut
// 3. The result of the query of one individual shortcut
// 4. The hostname and port of the application server
//
function report(request, response) {
    var query_shortcut=querystring.parse(url.parse(request.url).query).shortcut;
    var stmts = "SELECT COUNT(*) AS counter FROM shortcut_url;"+
                "SELECT shortcut, url FROM shortcut_url WHERE shortcut='"+query_shortcut+"'";

    connection.query(stmts, function(err, rows, fields) {
      if (err)
        errorpage(request, response, err);
      else {
	var rowcount = rows[0][0].counter;
console.log(stmts);
        var transform = { "<>":"tr","html":[
                         {"<>":"td","html":"${shortcut}"},
                         {"<>":"td","html":"${url}"}
                        ]};

        // output of reports page
        response.writeHead(200);
        response.write("<html><header><title>MESS Reports</title></header><body>");
        response.write("<h1>MESS - The full report</h1>");
        response.write("Number of stored shortcuts: " + rowcount +"<br>");
        response.write("<form action='/report.mess' method='get'><fieldset><legend>Query a shortcut</legend>");
        response.write("Shortcut:<input type='text' name='shortcut' value=''><input type='submit' value='Query'>");
        response.write("</fieldset></form><br>");
        response.write("<table><tbody><tr><th>Shortcut</th><th>URL</th></tr>"+json2html.transform(JSON.stringify(rows[1])
, transform)+"</tbody></table>");
	response.write("<p>App server is "+process.env.ORA_INSTANCE_NAME+":"+process.env.PORT+"</p></body></html>", "bina
ry");
        response.end();
      }
    });
}


//
// function forward is the default usage of MESS.
// The defined key is looked up in the database and then
// the function creates a small http page with a forwarding header to the stored url
//
function forward(request, response, key) {
    const forward1='<html> <head> <meta http-equiv="refresh" content="0; URL=';
    const forward2='"> </head> <body> <h1>MESS</h1> <p>This forward is presented to you by MESS - My Excellent Shortcut Server </p> </body> </html>';
    var query = 'SELECT url FROM shortcut_url WHERE shortcut="'+key+'"';
    connection.query(query, function(err, rows, fields) {
      if (err) errorpage(request, response, err);
      else if (rows.length == 0) startpage(response);
      else {
        response.writeHead(200);
        response.write(forward1.concat(rows[0].url).concat(forward2), "binary");
        response.end();
      }
    });      
}


//
// function errorpage is a helper function to display an error page for all generic errors.
//
function errorpage (request, response, err) {
    response.writeHead(500);
    response.write("<html><head><title>MESS - Error</title></head><body><h1>What a MESS</h1><br>");
    response.write("This is embarrassing. My Excellent Shortcut Service has an error.<br>");
    response.write("Please send a meaningless bug report to /dev/null.<br>");
    response.write("<br>"+JSON.stringify(err)+"</body></html>");
    response.end();
}

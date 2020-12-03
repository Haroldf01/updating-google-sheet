const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const sheets = google.sheets('v4');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.raw());

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

/**
 * I choose v4 method to update the sheet, in this first have to authenticate the user,
 * after authentication is successful, the user with can update the sheet.
 */

/**
 * authorize() and getNewToken() are the helper functions to authenticate the user before the credentials used for updating the google sheet
 */

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */

function authorize(credentials, callback) {
    const { client_secret, client_id, redirect_uris } = credentials;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getNewToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error while trying to retrieve access token', err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) return console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */


/*
 * This get function and endpoint is to retrieve the data from the spreedsheet
 * first it checks for the authentication, if
 */

app.get('/get-user-data', function() {
    // Load client secrets from a local file.
    fs.readFile('credentials.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        // Authorize a client with credentials, then call the Google Sheets API.
        authorize(JSON.parse(content), getUserData);
    });

    function getUserData(auth) {
        const sheets = google.sheets({ version: 'v4', auth });
        sheets.spreadsheets.values.get({
            spreadsheetId: '1AiInL69IQcxlbXHRzMvCEsvczQKb4PBIZQZVwQOU7DQ',
            range: 'Sheet1!A1:E',
        }, (err, res) => {
            if (err) return console.log('The API returned an error: ' + err);
            const rows = res.data.values;
            if (rows.length) {
                console.log('Name, Major:');
                // Print columns A and E, which correspond to indices 0 and 4.
                rows.map((row) => {
                    console.log(`${row[0]}, ${row[1]}, ${row[2]}, ${row[3]}, ${row[4]}`);
                });
            } else {
                console.log('No data found.');
            }
        });
    }
});

app.post('/add-new-user', function(req, res) {
    let spreadsheetId = '1AiInL69IQcxlbXHRzMvCEsvczQKb4PBIZQZVwQOU7DQ';
    let range = 'Sheet1!A1:E2';
    let valueInputOption = 'USER_ENTERED';
    let data = req.body;

    let resource = {
        "values": [
            [
                data['first_name'],
                data['last_name'],
                data['email'],
                data['mobile_number'],
                data['password'],
            ]
        ]
    }

    res.sendStatus(200);

    // This block of code is to check whether localStorage is predefined or not
    // If it's undefined the below code executes and imports the required package
    if (typeof localStorage === "undefined" || localStorage === null) {
        var LocalStorage = require('node-localstorage').LocalStorage;
        localStorage = new LocalStorage('./scratch');
    }

    // This is where entered userData is stored in the localStorage
    localStorage.setItem('userData', JSON.stringify(data));

    // Load client secrets from a local file.
    fs.readFile('credentials.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        // Authorize a client with credentials, then call the Google Sheets API.
        // After authorization is successful, the updateSheet() function is called and there the user Entered data is stored
        authorize(JSON.parse(content), updateSheet);
    });

    function updateSheet(auth) {
        const sheets = google.sheets({ version: 'v4', auth });
        sheets.spreadsheets.values.append({
            spreadsheetId,
            range,
            valueInputOption,
            resource,
        }, (err, result) => {
            if (err) {
                // Handle error
                console.log(err);
            } else {
                console.log('%d cells updated.', result.updatedCells);
            }
        });
    }
});

app.listen(9000, () => console.log(`Started server at http://localhost:9000`));
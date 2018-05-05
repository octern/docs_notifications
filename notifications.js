/*
       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
       Google Doc Monitor: Get Alerts When Any Google Document is Updated - Techawakening.org
       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


                      For instructions, go to http://techawakening.org/?p=3055
                      For queries, bugs reporting comment on the above article.

                  Written by Shunmugha Sundaram for Techawakening.org - OCT 27, 2014

            --.--        |                   |              o
              |,---.,---.|---.,---.. . .,---.|__/ ,---.,---..,---.,---. ,---.,---.,---.
              ||---'|    |   |,---|| | |,---||  \ |---'|   |||   ||   | |   ||    |   |
              ``---'`---'`   '`---^`-'-'`---^`   ``---'`   '``   '`---|o`---'`    `---|
                                                                  `---'           `---'
Change Log:

May-01-2015: Updated  file.getEditors[].getEmail() method call.
Oct-21-2015: V2 Released - Name of the Last Modified User will be sent along with the Timestamp.
Apr-22-2018: Ben Paul modified this for Indivisible SF
Apr-30-2018: Michael Cohn modified to check all docs inside a folder

INSTRUCTIONS:
* Open the spreadsheet this script is attached to and put the ID for the google drive folder to monitor in the designated space.
* Example spreadsheet: https://docs.google.com/spreadsheets/d/1wpG_mY9CAon-E8gHK-Dm8Iw8D6rhA07V8BaviZ7xIcM/edit#gid=0
* Edit the variable "identifier" to specify a string that appears at the beginning of every file to monitor. (Use "" to monitor all files)
* Set a trigger for the script to run regularly
*/

function main() {

  var sheet = SpreadsheetApp.getActiveSheet();
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var identifier = "Accepting Comments";
  var folderId = sheet.getRange("C6").getValue();
  var folderId = folderId.toString().trim();
  var folder = DriveApp.getFolderById(folderId);
  var allFiles = folder.getFiles();
  processFiles(allFiles, identifier);
}

function processFiles(files, identifier) {
  while (files.hasNext()) {
    var file = files.next();
    var filename = file.getName();
    var fileId = file.getId();
    if(file.getName().toLowerCase().indexOf(identifier.toLowerCase()) != -1) {
      Logger.log(filename);
      Logger.log(fileId);
      monitorFile(fileId);
    }
 }

}


function getFile_(fileId)
{
    var file = DriveApp.getFileById(fileId);
    return file;
}

function getDoc_(fileId)
{
   var doc = DocumentApp.openById(fileId);
   return doc;
}

function getUserKey_(fileId) {
  // this is where the last version of document comments is saved in your user profile (the user running the script)
  var userKey = "Proposal " + fileId + " Comments Text";
  return userKey;
}

function monitorFile(fileId) {
  Logger.log("checking file ");
  Logger.log(fileId);
  try {
    var file = DriveApp.getFileById(fileId);
    var userProperties = PropertiesService.getUserProperties();
    var userKey = getUserKey_(fileId);
    var previousComments = userProperties.getProperty(userKey);
    var comments = getComments(fileId);

    if (comments != previousComments || previousComments == null) {
      Logger.log("Modified");
      var emails = getEmails(fileId);

      if(previousComments == null) {
          var emailSubject = "New proposal created: " + file.getName();
          var docLink = "https://docs.google.com/document/d/" + fileId;
          var emailBody = emailSubject + "\n\n" +
            "A new proposal was created at \n\n" +
                docLink + "\n\n" +
                  "You will receive email notifications about comments that are added.";
      }
      else {
          var emailSubject = "New Comment on " + file.getName();
          var docLink = "https://docs.google.com/document/d/" + fileId;
          var emailBody = emailSubject + "\n\n" +
            "Here are all the comments:" + "\n\n" +
              comments + "\n\n" +
                docLink + "\n\n" +
                  "You are receiving this notification because your email is listed on the proposal under the Get Emails section. To unsubscribe, remove your email from the proposal.";
      }
      if(emails && emails.length >= 1) {
        Logger.log("attempting to email " + emails.join());
        for (var i = 0; i < emails.length; i++) {
          MailApp.sendEmail(emails[i], emailSubject, emailBody);
          Logger.log("email sent to " + emails[i]);
        }

      }

      // update user property with new comments
      userProperties.setProperty(userKey, comments);

    } else {
      Logger.log("Not Modified");
    }
   }
  catch (error) {
    Logger.log("Sorry! Error " + error.toString() + " Occurred.");
  }
}

function getEmails(fileId) {
    // email regex from stackoverflow
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    var doc = getDoc_(fileId);
    var body = doc.getBody();
    var text = body.getText();
    var start = text.indexOf("[Start Emails]");
    var end = text.indexOf("[End Emails]");
    var match = text.substring(start, end);
    match = match.replace(/,/g, "\n"); // in case of a comma delimited list, replace comma with new line
    var lines = match.split('\n');
    var emails = [];

    for (var i = 0; i < lines.length; i++) {
      var email = lines[i].trim().toLowerCase();
      if (re.test(email) && emails.indexOf(email) === -1) {
        emails.push(email);
      }
    }

   return emails;
}

function getComments(fileId) {
  var doc = getDoc_(fileId);
  var body = doc.getBody();
  var text = body.getText();
  var start = text.indexOf("Comments (anyone can write one)");
  var match = text.substring(start).trim(); // go until the end of the doc

  return match;
}

function authorize()
{
  spreadsheet.toast("Once authorized, enter File ID, Email IDs and select Google Doc Monitor-> Start Monitoring","",20);
}

function onOpen()
{
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var menuEntries = [ {name: "1. Authorize", functionName: "authorize"},
    {name: "2. Start Monitoring", functionName: "startMonitoring"},
    {name: "3. Stop Monitoring", functionName: "stopMonitoring"},
  ];
  ss.addMenu("➤ Google Doc Monitor", menuEntries);
  spreadsheet.toast("Once Drive API has been enabled, Select Google Doc Monitor-> Authorize. This is an One Time Action.","Get Started",-1);
}

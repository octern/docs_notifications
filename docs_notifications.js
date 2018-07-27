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
Apr-22-2018: Ben Paul modified this for Indivisible SF.
Apr-30-2018: Michael Cohn modified to check all docs inside a folder.
May-07-2018: Ben Paul modified this to create triggers itself and not to be attached to a sheet.

INSTRUCTIONS:
* Edit the variable "identifier" to specify a string that is contained in every file to monitor. Case-insensitive. (Use "" to monitor all files.)
* Run main(). This will create a trigger for the script to run regularly.
*/

function main() {
  clearTriggers();
  ScriptApp.newTrigger("processFiles").timeBased().everyMinutes(10).create();
}

function clearTriggers() {
    var allTriggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < allTriggers.length; i++)
        ScriptApp.deleteTrigger(allTriggers[i]);
}

function processFiles() {
  var identifier = "accepting comments";
  var folderId = "1630EKTJErgblzc5oeDQNiK6riTqFweUP";
  var folder = DriveApp.getFolderById(folderId);
  var files = folder.getFiles();
  
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

function getDoc(fileId)
{
   var doc = DocumentApp.openById(fileId);
   return doc;
}

function getUserKey(fileId) {
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
    var userKey = getUserKey(fileId);
    var previousComments = userProperties.getProperty(userKey);
    var comments = getComments(fileId);

    if (comments != previousComments || previousComments == null) {
      Logger.log("Modified");
      var emails = getEmails(fileId);
      Logger.log("Found emails " + emails);

      if(previousComments == null) {
          var fileName = file.getName();
          var emailSubject = "New proposal created: " + fileName;
          var docLink = "https://docs.google.com/document/d/" + fileId;
          var emailBody = "A new proposal, " + fileName + ", was created at\n\n" +
                docLink + "\n\n" +
                  "You will receive email notifications about comments that are added. To unsubscribe, remove your email from the proposal in the Email Subscriptions section.";
      }
      else {
          var fileName = file.getName();
          var emailSubject = "New comment on " + fileName;
          var docLink = "https://docs.google.com/document/d/" + fileId;
          var emailBody = "There's a new comment on " + fileName + ".\n\n" +
                docLink + "\n\n" +
                  "Here are all the comments:" + "\n\n" +
                    comments + "\n\n" +
                      "You are receiving this notification because your email is listed on the proposal. To unsubscribe, remove your email from the proposal in the Email Subscriptions section.";
      }
      if(emails && emails.length >= 1) {
        Logger.log("Attempting to email " + emails.join());
        for (var i = 0; i < emails.length; i++) {
          MailApp.sendEmail(emails[i], emailSubject, emailBody);
          Logger.log("Email sent to " + emails[i]);
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

    var doc = getDoc(fileId);
    var body = doc.getBody();
    var text = body.getText();
    var start = text.toLowerCase().indexOf("[start emails]");
    var end = text.toLowerCase().indexOf("[end emails]");
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
  var comments_identifier = "comments (anyone can write one)"
  var doc = getDoc(fileId);
  var body = doc.getBody();
  var text = body.getText();
  var start = text.toLowerCase().indexOf(comments_identifier) + comments_identifier.length;
  var match = text.substring(start).trim(); // go until the end of the doc

  return match;
}

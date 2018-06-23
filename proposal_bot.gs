function onSubmit(e) {
  
  var templateFileId = "PRIVATE";
  var slackUrl = "PRIVATE";
  var bitlyToken = "PRIVATE";
  
  var formResponse = e.response;
  
  // get title
  var proposalTitle = getProposalTitle(formResponse);
  
  // copy template to new doc
  var newFile = copyTemplateFile(templateFileId);
  var newId = newFile.getId();
  var newUrl = newFile.getUrl();
  var newDoc = DocumentApp.openById(newId);
  
  // put proposal in new doc
  insertProposalTitle(newDoc, proposalTitle);
  insertProposalText(newDoc, formResponse);
  
  // announce on Slack
  var bitlyUrl = getBitlyUrl(bitlyToken, newUrl);
  var dueDate = new Date().addDays(2);
  announceOnSlack(slackUrl, proposalTitle, bitlyUrl, dueDate);
}

Date.prototype.addDays = function(days) {
  // source: https://stackoverflow.com/a/563442
  var dat = new Date(this.valueOf());
  dat.setDate(dat.getDate() + days);
  return dat;
}

function copyTemplateFile(templateFileId) {
  var templateFile = DriveApp.getFileById(templateFileId);
  var newFile = templateFile.makeCopy("BEN TESTING PROPOSAL BOT");
  newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
  return(newFile);
}

function getProposalTitle(formResponse) {
  // title must be first answer
  var proposalTitle = "Untitled";
  var itemResponses = formResponse.getItemResponses();
  var firstAnswer = itemResponses[0].getResponse();
  if (firstAnswer.length > 0) {
    proposalTitle = firstAnswer;
  }
  return(proposalTitle);
}

function insertProposalTitle(doc, proposalTitle) {
  // replace file title
  doc.setName("BEN TESTING PROPOSAL BOT - " + proposalTitle);
  
  // replace title heading
  var body = doc.getBody();
  body.replaceText("Proposal Title", proposalTitle);
}

function insertProposalText(doc, formResponse) {
  // delete proposal text placeholder before inserting proposal text
  var body = doc.getBody()
  var text = body.findText("\\[insert proposal here\\]").getElement().asText();
  text = text.deleteText(0, "[insert proposal here]".length - 1);
  text = text.editAsText();

  // insert question and answers, starting at question 1 (since question 0 was the title)  
  var itemResponses = formResponse.getItemResponses();
  var offset = 0;
  for (var i = 1; i < itemResponses.length; i++) {
    var itemResponse = itemResponses[i];
    var question = itemResponse.getItem().getTitle();
    var answer = itemResponse.getResponse();
    if (question.length > 0 && answer.length > 0) { // only insert filled in questions
      question += "\n\n";
      if (i < itemResponses.length - 1) {
        answer += "\n\n";
      }
      text.appendText(question + answer);
      text.setBold(offset, offset + question.length - 1, true); // question is bold
      text.setBold(offset + question.length, offset + question.length + answer.length - 1, false); // answer is not bold
      offset += (question +  answer).length;
    }
  }
}

function getBitlyUrl(token, url) {
  var encodedUrl = encodeURIComponent(url);
  var getRequest = httpGet("https://api-ssl.bitly.com/v3/shorten?access_token=" + token + "&longUrl=" + encodedUrl);
  var bitlyData = JSON.parse(getRequest);
  var bitlyUrl = "bit.ly/" + bitlyData.data.hash;
  return(bitlyUrl);
}

function httpGet(url) {
  var http = UrlFetchApp.fetch(url)
  return http.getContentText();
}

function announceOnSlack(slackUrl, proposalTitle, bitlyUrl, dueDate) {
  var dueDateStr = Utilities.formatDate(dueDate, "US/Pacific", "EEE, MMM d, h:mm a 'Pacific Time'");
  
  var payload = {
    "channel" : "#test-proposal-bot",
    "username" : "proposal-bot",
    "icon_emoji": ":fist:",
    "link_names": 1
  };
  
  var announceText = "This would have been posted to #announcements:\n\n" +
              "A new proposal has been posted!\n\n" +
              "*Name:* _" + proposalTitle + "_\n\n" +
              "*Comment period closes*: " + dueDateStr + "\n\n" +
              "*How can you participate in the proposal process?*\n\n" +
              "Head over to #proposals and follow the quick directions. I expect it’ll take less than 5 mins to read, comment (if you want), and vote on the proposal. Head to #proposal_inbox if you have any questions or problems.";
  
  var announcePayload = payload;
  announcePayload['text'] = announceText;
  sendToSlack(slackUrl, announcePayload);
  
  var proposalsText = "This would have been posted to #proposals:\n\n" +
     "A new proposal has been posted!\n\n" +
      "Place your emoji vote (:+1: / :-1: / :stop:) on this post. Please do not comment in this channel. Comment in the *Comments* section at the bottom of the Google Doc linked below. Please head over to #proposal_inbox if you have any questions about this process.\n\n" +
        "*Name:* _" + proposalTitle + "_\n\n" + 
          "*Comment period closes:* " + dueDateStr + "\n\n" +
            "*Link to proposal:* " + bitlyUrl;
  
  var proposalsPayload = payload;
  proposalsPayload['text'] = proposalsText;
  sendToSlack(slackUrl, proposalsPayload);
}

function sendToSlack(url, payload) {
   var options =  {
    "method" : "post",
    "contentType" : "application/json",
    "payload" : JSON.stringify(payload)
  };
  return UrlFetchApp.fetch(url, options)
}

'use strict'
const express = require('express')
const bodyParser = require('body-parser')
const request = require('request');
const app = express()
const TEXTS = require('./lib/texts.js');
const _ = require('underscore');
const mongoose = require('mongoose');
const crypto = require('crypto');
const rp = require('request-promise');
const wit = require('node-wit');
const path=require('path');
const ACCESS_TOKEN = "EGW7CDB33FI6Y6LLAIPXLDY7YA7AWVVQ";
app.set('port', (process.env.PORT || 8081))
  // parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
  extended: false
}))
app.use(bodyParser.json({
  verify: verifyRequestSignature
}));
app.use(express.static(path.join(__dirname, 'views')));
// parse application/json
app.use(bodyParser.json())
var previousMessageHash = {};
var senderContext = {};
var isStopped = false;
var firstName = "undefined";
var lastName = "undefined";
// App Secret can be retrieved from the App Dashboard
const APP_SECRET = "0f116068d89484343c6a2af0ec7a5eab";
// Arbitrary value used to validate a webhook
const VALIDATION_TOKEN = "my_voice_is_my_password_verify_me";
// Generate a page access token for your page from the App Dashboard
const PAGE_ACCESS_TOKEN = "EAAC3EdKuMoUBAD0jZBsZAjZAqtFfZC6VEvXHgm5Bo0NVJAVbMhiGikG5IZCMY5PupSAvICd0DUTAtMOKHgLTuMZBRVUqKXT30pNz7H9ESQxGUXGcZAf9R5ipBXjJrPsqTuuTYWf464oWz7Ha5KvXaPlT9YbLCTGRBtuWWKGvCO4kgZDZD";
if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN)) {

  console.error("Missing config values");
  process.exit(1);
}
/*TEST WEBHOOK*/
app.get('/', function(req, res) {
    res.send('hello world i am a secret bot')
  })
app.get('/delivery', function(req, res) {
      fs.readFile("index.html", function(err, data){
         if(err){
            response.writeHead(404);
            response.write("Not Found!");
         }
         else{
            response.writeHead(200, {'Content-Type': contentType});
            response.write(data);
         }
         response.end();
      });
  })

  /* DATABASE PART START*/
const dbconfig = require('./lib/config');
//////CONECTION FOR OPENSHIFT
mongoose.connect(dbconfig.options.uri); // connect to our database
// When successfully connected
mongoose.connection.on('connected', function() {
  console.log('Mongoose default connection open to ' + dbconfig.options.uri);
});
mongoose.connection.on('error', function(err) {
  console.log('Mongoose default connection error: ' + err);
});
// When the connection is disconnected
mongoose.connection.on('disconnected', function() {
  console.log('Mongoose default connection disconnected');
});
// If the Node process ends, close the Mongoose connection
process.on('SIGINT', function() {
  mongoose.connection.close(function() {
    console.log('Mongoose default connection disconnected through app termination');
    process.exit(0);
  });
});
/* DATABASE PART END*/
function callwitAPI(messageData, callback) {
  request({
    uri: 'https://api.wit.ai/message',
    qs: {
      v: 20141022,
      q: messageData
    },
    headers: {
      'Authorization': 'Bearer ' + ACCESS_TOKEN,
      'content-type': 'application/json'
    },
    method: 'GET'
  }, function(error, response, body) {
    if (response) {
      // console.log(typeof(JSON.parse(response.body)).outcomes);
      // console.log(JSON.parse(response.body).outcomes);
      callback(response.body)
    }
  });
}

function verifyRequestSignature(req, res, buf) {
    var signature = req.headers["x-hub-signature"];
    if (!signature) {
      // For testing, let's log an error. In production, you should throw an 
      // error.
      console.error("Couldn't validate the signature with app secret:" + APP_SECRET);
    } else {
      var elements = signature.split('=');
      var method = elements[0];
      var signatureHash = elements[1];
      var expectedHash = crypto.createHmac('sha1', APP_SECRET)
        .update(buf)
        .digest('hex');
      if (signatureHash != expectedHash) {
        throw new Error("Couldn't validate the request signature: " + APP_SECRET);
      }
    }
  }
  // for facebook verification
  // recommended to inject access tokens as environmental variables, e.g.
  // const token = process.env.PAGE_ACCESS_TOKEN
app.get('/webhook/', function(req, res) {
    if (req.query['hub.verify_token'] === 'my_voice_is_my_password_verify_me') {
      res.send(req.query['hub.challenge'])
    } else {
      res.send('Error, wrong token')
    }
  })
  // to post data
app.post('/webhook/', function(req, res) {
  var data = req.body;
  // Make sure this is a page subscription
  if (data.object == 'page') {
    // Iterate over each entry
    // There may be multiple if batched
    data.entry.forEach(function(pageEntry) {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;
      // Iterate over each messaging event
      pageEntry.messaging.forEach(function(messagingEvent) {
        console.log("Code Input");
        var sender = messagingEvent.sender.id;
        //  console.log({sender:sender});
        var sessionId = findOrCreateSession(sender);
        if (messagingEvent.optin) {
          console.log("Message receive nsert")
          receivedAuthentication(messagingEvent);
        } else if (messagingEvent.message) {
          console.log("Message event insert");
          if (messagingEvent.message.attachments && messagingEvent.message.attachments[0].type === 'location' && sessionId.state === 'PICKUP_BROWSE') {
            sessions[sender].pickup_coordinates = [messagingEvent.message.attachments[0].payload.coordinates.lat, messagingEvent.message.attachments[0].payload.coordinates.long];
            sessions[sender].pickup_location = messagingEvent.message.attachments[0].title;
            setDestinationRide(sender);
            console.log(sessions[sender]);
          } else {
            console.log("Message event insert")
            if (messagingEvent.message.attachments && messagingEvent.message.attachments[0].type === 'location' && sessionId.state === 'DESTINATION_BROWSE') {
              sessions[sender].destination_coordinates = [messagingEvent.message.attachments[0].payload.coordinates.lat, messagingEvent.message.attachments[0].payload.coordinates.long];
              sessions[sender].destination_location = messagingEvent.message.attachments[0].title;
              console.log(sessions[sender]);
              setSchdulingRide(sender);
            } else {
              if (messagingEvent.message.text && sessionId.state === 'SET_SCHEDULING') {
                callwitAPI(messagingEvent.message.text, function(response1) {
                  console.log(typeof(response1));
                  sessions[sender].schedule = JSON.parse(response1)
                    .outcomes[0].entities.datetime[0].value;
                  console.log(sessions[sender]);
                  sendSchduleText(sender);
                });
              } else {
                receivedMessage(messagingEvent);
              }
            }
          }
        } else if (messagingEvent.delivery) {
          //receivedDeliveryConfirmation(messagingEvent);
        } else if (messagingEvent.postback) {
          console.log("Postback");
          receivedPostback(messagingEvent);
        } else if (messagingEvent.read) {
          receivedMessageRead(messagingEvent);
        } else {
          console.log("Webhook received unknown messagingEvent: ", messagingEvent);
        }
      });
    });
    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know you've 
    // successfully received the callback. Otherwise, the request will time out.
    res.sendStatus(200);
  }
});
var sessions = {}
var findOrCreateSession = function(fbid, state) {
    var sessionData;
    const SESSION_DURATION = 180000;
    const nowis = new Date()
      .getTime();
    if (sessions[fbid]) {
      console.log("OLD Session ID");
      if (nowis - sessions[fbid].last_seen > SESSION_DURATION) {
        sessions[fbid].session = false;
        sessions[fbid].last_seen = nowis;
        sessions[fbid].pickup_location = null;
        sessions[fbid].destination_location = null;
        sessions[fbid].pickup_coordinates = []; // create the geospatial index},,
        sessions[fbid].destination_coordinates = [];
        sessions[fbid].schedule = null
      } else {
        sessions[fbid].session = true;
      }
    } else {
      console.log("New Session ID");
      sessions[fbid] = {
        fbid: fbid,
        state: state ? state : 'initial',
        last_seen: nowis,
        session: false,
        pickup_location: null,
        destination_location: null,
        pickup_coordinates: [], // create the geospatial index},,
        destination_coordinates: [],
        schedule: null
      }
    }
    // No session so we will create one
    console.log(nowis);
    console.log(nowis - sessions[fbid].last_seen);
    return sessions[fbid];
  }
  /*RECEIVE MESSAGE START*/
function receivedMessage(event) {
  callGetLocaleAPI(event, handleReceivedMessage);
}

function callGetLocaleAPI(event, handleReceived) {
  var userID = event.sender.id;
  var http = require('https');
  var path = '/v2.6/' + userID + '?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=' + PAGE_ACCESS_TOKEN;
  var options = {
    host: 'graph.facebook.com',
    path: path
  };
  if (senderContext[userID]) {
    firstName = senderContext[userID].firstName;
    lastName = senderContext[userID].lastName;
    console.log("found " + JSON.stringify(senderContext[userID]));
    if (!firstName)
      firstName = "undefined";
    if (!lastName)
      lastName = "undefined";
    handleReceived(event);
    return;
  }
  var req = http.get(options, function(res) {
    var bodyChunks = [];
    res.on('data', function(chunk) {
        // You can process streamed parts here...
        bodyChunks.push(chunk);
      })
      .on('end', function() {
        var body = Buffer.concat(bodyChunks);
        var bodyObject = JSON.parse(body);
        firstName = bodyObject.first_name;
        lastName = bodyObject.last_name;
        if (!firstName)
          firstName = "undefined";
        if (!lastName)
          lastName = "undefined";
        senderContext[userID] = {};
        senderContext[userID].firstName = firstName;
        senderContext[userID].lastName = lastName;
        console.log("defined " + JSON.stringify(senderContext));
        handleReceived(event);
      })
  });
  req.on('error', function(e) {
    console.log('ERROR: ' + e.message);
  });
}

function handleReceivedMessage(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfMessage = event.timestamp;
    var message = event.message;
    var isEcho = message.is_echo;
    var messageId = message.mid;
    var appId = message.app_id;
    var metadata = message.metadata;
    // You may get a text or attachment but not both
    var messageText = message.text;
    console.log(messageText);
    var messageAttachments = message.attachments;
    console.log(messageAttachments);
    var quickReply = message.quick_reply;
    console.log(quickReply);
    if (isEcho) {
      // Just logging message echoes to console
      console.log("Received echo for message %s and app %d with metadata %s",
        messageId, appId, metadata);
      return;
    } else if (quickReply) {
      var quickReplyPayload = quickReply.payload;
      messageText = quickReplyPayload;
      sendCustomMessage(senderID, messageText);
      return;
    }
    if (messageText) {
      if ((isStopped == true) && (messageText !== "start")) {
        return;
      }
      console.log("Received message for user %d and page %d at %d with message: %s",
        senderID, recipientID, timeOfMessage, messageText);
      // If we receive a text message, check to see if it matches any special
      // keywords and send back the corresponding example. Otherwise, just echo
      // the text we received.
      console.log(messageText);
      switch (messageText.toLowerCase()) {
        case 'hi':
          sendWelcomeMessage(senderID);
          break;
        case 'hello':
          sendWelcomeMessage(senderID);
          break;
        case 'stop': // Stop the Bot from responding if the admin sends this messages
          if (senderID == 1073962542672604) {
            console.log("Stoppping bot");
            isStopped = true;
          }
          break
        case 'start': // start up again
          if (senderID == 1073962542672604) {
            console.log("Starting bot");
            isStopped = false;
          }
          break
        default:
          sendWelcomeMessage(senderID);
      }
    } else if (messageAttachments) {
      if (messageAttachments[0].payload.url)
        sendWelcomeMessage(senderID, messageAttachments[0].payload.url);
    }
  }
  /*RECEIVE MESSAGE END*/
  /*RECEIVE Postback START*/
function receivedPostback(event) {
  if (isStopped == true) {
    return;
  }
  //sendTextMessage(event, handleReceivedPostback);
  handleReceivedPostback(event);
}

function receivedMessageRead(event) {
  if (isStopped == true) {
    return;
  }
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  // All messages before watermark (a timestamp) or sequence have been seen.
  var watermark = event.read.watermark;
  var sequenceNumber = event.read.seq;
  console.log("Received message read event for watermark %d and sequence " +
    "number %d", watermark, sequenceNumber);
}

function receivedDeliveryConfirmation(event) {
  if (isStopped == true) {
    return;
  }
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var delivery = event.delivery;
  var messageIDs = delivery.mids;
  var watermark = delivery.watermark;
  var sequenceNumber = delivery.seq;
  if (messageIDs) {
    messageIDs.forEach(function(messageID) {
      console.log("Received delivery confirmation for message ID: %s",
        messageID);
    });
  }
  console.log("All message before %d were delivered.", watermark);
}

function handleReceivedPostback(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfPostback = event.timestamp;
    // The 'payload' param is a developer-defined field which is set in a postback 
    // button for Structured Messages. 
    var payload = event.postback.payload;
    console.log("Received postback for user %d and page %d with payload '%s' " +
      "at %d", senderID, recipientID, payload, timeOfPostback);
    // When a postback is called, we'll send a message back to the sender to 
    // let them know it was successful
    sendCustomMessage(senderID, payload);
  }
  /*RECEIVE Postback END*/
function sendCustomMessage(recipientId, messageText) {
  console.log("sendCustoMessage " + messageText);
  switch (messageText) {
    case 'TAKE_A_RIDE':
      setPickupRide(recipientId);
      break
    case 'hello':
      sendWelcomeMessage(recipientId);
      break
    case 'PICKUP_BROWSE':
      setDestinationRide(recipientId);
      break
    case 'CONFIRM_RIDE':
      confirmRide(recipientId);
      break
    case 'CANCEL_RIDE':
      cancelRide(recipientId);
      break
    case 'GET_STARTED_BUTTON':
      sendGetStartedMsg(recipientId);
      break
    default:
      sendWelcomeMessage(recipientId, messageText);
  }
  previousMessageHash[recipientId] = messageText.toLowerCase();
}

function setPickupRide(recipientId) {
  sessions[recipientId].state = 'PICKUP_BROWSE';
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: 'Step 1: Search from Map or type Pickup',
      metadata: 'PICKUP',
      quick_replies: [{
        "content_type": "location",
        "title": "PICKUP",
        "payload": "PICKUP"
      }]
    }
  };
  callSendAPI(messageData);
};

function setDestinationRide(recipientId) {
  sessions[recipientId].state = 'DESTINATION_BROWSE';
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: 'Step 2: Search from Map or type Destination',
      metadata: 'DESTINATION',
      quick_replies: [{
        "content_type": "location",
        "title": "DESTINATION",
        "payload": "DESTINATION"
      }]
    }
  };
  callSendAPI(messageData);
};

function setSchdulingRide(recipientId) {
  sessions[recipientId].state = 'SET_SCHEDULING';
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: 'Step 3: Set Sheduling'
    }
  };
  callSendAPI(messageData);
}

function confirmRide(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: 'Thank you for choosing Oikhali,Our customer service will be knock as soon as possible'
    }
  };
  callSendAPI(messageData);
}

function cancelRide(recipientId) {
  sendWelcomeMessage(recipientId);
}

function sendSchduleText(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": sessions[recipientId].pickup_location + ' - ' + sessions[recipientId].destination_location,
            "subtitle": sessions[recipientId].schedule,
            "buttons": [{
              "type": "postback",
              "title": "Confirm",
              "payload": "CONFIRM_RIDE"
            }, {
              "type": "postback",
              "title": "Cancel",
              "payload": "CANCEL_RIDE"
            }]
          }]
        }
      }
    }
  };
  callSendAPI(messageData);
}

function sendWelcomeMessage(recipientId) {
  var nameString = firstName + " " + lastName;
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: 'Hi, ' + nameString + ' please select option from the left menu or tap any option in below',
      quick_replies: [{
        "content_type": "text",
        "title": "Get a RIDE",
        "payload": "TAKE_A_RIDE"
      }, {
        "content_type": "text",
        "title": "Query",
        "payload": "QUERY"
      }, {
        "content_type": "text",
        "title": "Complain",
        "payload": "COMPLAIN"
      }]
    }
  };




  var messageData2 = {
    recipient: {
      id: recipientId
    },
    message:{
    "attachment":{
      "type":"template",
      "payload":{
        "template_type":"button",
        "text":"What do you want to do next?",
        "buttons":[
          {
            "type":"web_url",
            "url":"https://petersapparel.parseapp.com",
            "title":"Show Website"
          },
          {
                "type":"web_url",
                "url":"https://oikhalibot.zahidur.me",
                "title":"Select Criteria",
                "webview_height_ratio": "full",
                "messenger_extensions": true,  
                "fallback_url": "https://oikhalibot.zahidur.me/fallback"
          }
        ]
      }
    }
  }
  };



  callSendAPI(messageData);

  callSendAPI(messageData2);
}

function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: {
      access_token: PAGE_ACCESS_TOKEN
    },
    method: 'POST',
    json: messageData
  }, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;
      if (messageId) {
        console.log("Successfully sent message with id %s to recipient %s",
          messageId, recipientId);
      } else {
        console.log("Successfully called Send API for recipient %s",
          recipientId);
      }
    } else {
      console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
    }
  });
}

function addPersistentMenu() {
  request({
    url: 'https://graph.facebook.com/v2.6/me/thread_settings',
    qs: {
      access_token: PAGE_ACCESS_TOKEN
    },
    method: 'POST',
    json: {
      setting_type: "call_to_actions",
      thread_state: "existing_thread",
      call_to_actions: [{
        type: "postback",
        title: "Take a New CNG Ride",
        payload: "TAKE_A_RIDE"
      }, {
        type: "postback",
        title: "Query",
        payload: "query"
      }, {
        type: "postback",
        title: "Complain",
        payload: "complain"
      }, {
        type: "web_url",
        title: "About Us",
        url: "http://www.oikhali.com/"
      },
      {
                type:"web_url",
                url:"https://oikhalibot.zahidur.me",
                title:"Select Criteria",
                webview_height_ratio: "full",
                messenger_extensions: true
      }]
    }
  }, function(error, response, body) {
    //  console.log(response)
    if (error) {
      console.log('Error sending messages: ', error)
    } else if (response.body.error) {
      console.log('Error: ', response.body.error)
    }
  })
}
function addWhistlingDomain() {
  request({
    url: 'https://graph.facebook.com/v2.6/me/thread_settings',
    qs: {
      access_token: PAGE_ACCESS_TOKEN
    },
    method: 'POST',
    json: {
      setting_type: "domain_whitelisting",
      whitelisted_domains: ["https://oikhalibot.zahidur.me/"],
      domain_action_type: "add"
    }
  }, function(error, response, body) {
    // console.log(response)
    if (error) {
      console.log('Error sending messages: ', error)
    } else if (response.body.error) {
      console.log('Error: ', response.body.error)
    }
  })
}

addWhistlingDomain();

function getStartedButton() {
  request({
    url: 'https://graph.facebook.com/v2.6/me/thread_settings',
    qs: {
      access_token: PAGE_ACCESS_TOKEN
    },
    method: 'POST',
    json: {
      setting_type: "call_to_actions",
      thread_state: "new_thread",
      call_to_actions: [{
        payload: "GET_STARTED_BUTTON"
      }]
    }
  }, function(error, response, body) {

    if (error) {
      console.log('Error sending messages: ', error)
    } else if (response.body.error) {
      console.log('Error: ', response.body.error)
    }
  })
}
getStartedButton();
addPersistentMenu();

function sendGetStartedMsg(recipientId) {
  welcomeMessage(recipientId, function(response) {
    var nameString = response.first_name + ' ' + response.last_name;
    var messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        text: 'Hi, ' + nameString + ' please select option from the left menu or tap any option in below',
        quick_replies: [{
          "content_type": "text",
          "title": "Get a RIDE",
          "payload": "TAKE_A_RIDE"
        }, {
          "content_type": "text",
          "title": "Query",
          "payload": "QUERY"
        }, {
          "content_type": "text",
          "title": "Complain",
          "payload": "COMPLAIN"
        }]
      }
    };
    callSendAPI(messageData);
  });
}

function welcomeMessage(senderFBId, callback) {
    var http = require('https');
    var path = '/v2.6/' + senderFBId + '?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=' + PAGE_ACCESS_TOKEN;
    var options = {
      host: 'graph.facebook.com',
      path: path
    };
    var req = http.get(options, function(res) {
      // Buffer the body entirely for processing as a whole.
      var bodyChunks = [];
      console.log()
      res.on('data', function(chunk) {
          // You can process streamed parts here...
          bodyChunks.push(chunk);
        })
        .on('end', function() {
          var body = Buffer.concat(bodyChunks);
          var bodyObject = JSON.parse(body);
          firstName = bodyObject.first_name;
          lastName = bodyObject.last_name;
          if (!firstName)
            firstName = "undefined";
          if (!lastName)
            lastName = "undefined";
          console.log(bodyObject);
          callback(bodyObject);
        })
    });
    req.on('error', function(e) {
      console.log('ERROR: ' + e.message);
    });
  }
  // Get the Facebook info of user we are talking to
function getFBInfo(fbUserId) {}

function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText,
      metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };
  callSendAPI(messageData);
}

function receivedAuthentication(event) {
  if (isStopped == true) {
    return;
  }
  var data = req.body;
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfAuth = event.timestamp;
  // The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
  // The developer can set this to an arbitrary value to associate the 
  // authentication callback with the 'Send to Messenger' click event. This is
  // a way to do account linking when the user clicks the 'Send to Messenger' 
  // plugin.
  var passThroughParam = event.optin.ref;
  console.log("Received authentication for user %d and page %d with pass " +
    "through param '%s' at %d", senderID, recipientID, passThroughParam,
    timeOfAuth);
  // When an authentication is received, we'll send a message back to the sender
  // to let them know it was successful.
  sendTextMessage(senderID, "Authentication successful");
}

function receivedDeliveryConfirmation(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var delivery = event.delivery;
    var messageIDs = delivery.mids;
    var watermark = delivery.watermark;
    var sequenceNumber = delivery.seq;
    if (messageIDs) {
      messageIDs.forEach(function(messageID) {
        console.log("Received delivery confirmation for message ID: %s",
          messageID);
      });
    }
    console.log("All message before %d were delivered.", watermark);
  }
  // listening port
app.listen(app.get('port'), function() {
  console.log('running on port', app.get('port'))
})
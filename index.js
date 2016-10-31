'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request');
const app = express()
const TEXTS = require('./lib/texts.js');
const _ = require('underscore');
const mongoose = require('mongoose');
const crypto = require('crypto');

app.set('port', (process.env.PORT || 4041))

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
    extended: false
}))
app.use(bodyParser.json({
    verify: verifyRequestSignature
}));

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
const PAGE_ACCESS_TOKEN = "EAAC3EdKuMoUBAHuMeYqMrqpkXBVCojEvL7yZB1KEfPZCkNrFLPlZAS7JOBNFho5dzCIjPXfRJOENUdnebM5zzZAEdADqCkZCwfODwTJkfzobA3KlU0ecvwHtdy6iQlLqgshZCwhgFUP6oleQCoZCNC7xajHzb8LOyMxeCFNrwqmJgZDZD";

if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN)) {
    console.error("Missing config values");
    process.exit(1);
}

/*TEST WEBHOOK*/
app.get('/', function(req, res) {
    res.send('hello world i am a secret bot')
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
              console.log(messagingEvent);
              if(messagingEvent.postback){
                receivedPostback(messagingEvent);
                }
              if (messagingEvent.message) {
                receivedMessage(messagingEvent);
                }              
/*                if (messagingEvent.optin) {
                    receivedAuthentication(messagingEvent);
                } else if (messagingEvent.message) {
                    receivedMessage(messagingEvent);
                } else if (messagingEvent.delivery) {
                    receivedDeliveryConfirmation(messagingEvent);
                } else if (messagingEvent.postback) {
                    receivedPostback(messagingEvent);
                } else if (messagingEvent.read) {
                    receivedMessageRead(messagingEvent);
                } else {
                    console.log("Webhook received unknown messagingEvent: ", messagingEvent);
                }*/
            });
        });

        // Assume all went well.
        //
        // You must send back a 200, within 20 seconds, to let us know you've 
        // successfully received the callback. Otherwise, the request will time out.
        res.sendStatus(200);
    }
});

/*RECEIVE MESSAGE START*/
function receivedMessage(event) {
      callGetLocaleAPI(event, handleReceivedMessage);
}


function callGetLocaleAPI(event, handleReceived) {
    var userID = event.sender.id;
    var http = require('https');
    var path = '/v2.6/' + userID +'?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=' + PAGE_ACCESS_TOKEN;
    var options = {
      host: 'graph.facebook.com',
      path: path
    };
    
    if(senderContext[userID])
    {
       firstName = senderContext[userID].firstName; 
       lastName = senderContext[userID].lastName; 
       console.log("found " + JSON.stringify(senderContext[userID]));
       if(!firstName) 
          firstName = "undefined";
       if(!lastName) 
          lastName = "undefined";
       handleReceived(event);
       return;
    }

    var req = http.get(options, function(res) {
      //console.log('STATUS: ' + res.statusCode);
      //console.log('HEADERS: ' + JSON.stringify(res.headers));

      // Buffer the body entirely for processing as a whole.
      var bodyChunks = [];
      res.on('data', function(chunk) {
        // You can process streamed parts here...
        bodyChunks.push(chunk);
      }).on('end', function() {
        var body = Buffer.concat(bodyChunks);
        var bodyObject = JSON.parse(body);
        firstName = bodyObject.first_name;
        lastName = bodyObject.last_name;
        if(!firstName) 
          firstName = "undefined";
        if(!lastName) 
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
  console.log(event);

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
  var messageAttachments = message.attachments;
  var quickReply = message.quick_reply;

  if (isEcho) {
    // Just logging message echoes to console
    console.log("Received echo for message %s and app %d with metadata %s", 
      messageId, appId, metadata);
    return;
  } else if (quickReply) {
    var quickReplyPayload = quickReply.payload;
//console.log("Quick reply for message %s with payload %s",
// messageId, quickReplyPayload);

    messageText = quickReplyPayload;
    sendCustomMessage(senderID,messageText);
    return;
  }

  if(messageText){
        sendCustomMessage(senderID,messageText);
  }



}
/*RECEIVE MESSAGE END*/


/*RECEIVE Postback START*/
function receivedPostback(event) {
  if(isStopped == true)
  {
    return;
  }
  sendTextMessage(event, handleReceivedPostback);
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
  sendCustomMessage(senderID,payload);
}

/*RECEIVE Postback END*/

function sendCustomMessage(recipientId,messageText) {

console.log("sendCustoMessage "+ messageText);
sendLocale(recipientId);
/*    switch (messageText.toLowerCase()) {

      case 'joke':
        sendJoke(recipientId);
        break        

      case 'image':
        sendRandomImage(recipientId);
        break        

      case 'who':
        sendLocale(recipientId);
        break        
      
      case 'add keyword':
        addKeywordStep1(recipientId);
        break        

      case 'list keywords':
        sendKeywordList(recipientId);
        break        

      case 'addkeyword_text':
        addKeywordText(recipientId);
        break

      case 'addkeyword_button':
        addKeywordButton(recipientId);
        break

      case 'addkeyword_button1':
        addKeywordButtonStep3(recipientId,1);
        break

      case 'addkeyword_button2':
        addKeywordButtonStep3(recipientId,2);
        break

      case 'addkeyword_button3':
        addKeywordButtonStep3(recipientId,3);
        break


      default:
         sendJsonMessage(recipientId,messageText);

    }*/
    previousMessageHash[recipientId] = messageText.toLowerCase();
}
function sendLocale(recipientId) {

  var nameString = firstName + " " + lastName;

  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: nameString,
      quick_replies: [
        {
          "content_type":"text",
          "title":"Home",
          "payload":"home"
        }
      ]
    }
  };

  callSendAPI(messageData);
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




function addPersistentMenu(){
 request({
    url: 'https://graph.facebook.com/v2.6/me/thread_settings',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json:{
        setting_type : "call_to_actions",
        thread_state : "existing_thread",
        call_to_actions:[
            {
              type:"postback",
              title:"Take a New CNG Ride",
              payload:"new_ride_request"
            },
            {
              type:"postback",
              title:"Query",
              payload:"query"
            },
            {
              type:"postback",
              title:"Complain",
              payload:"complain"
            },            
            {
              type:"web_url",
              title:"About Us",
              url:"http://www.oikhali.com/"
            }
          ]
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

addPersistentMenu();







function welcomeMessage(senderFBId, callback) {
    return getFBInfo(senderFBId).then(user => {
        // console.log({
        //     user: user
        // });
        callback(`Hi ${user.first_name}, welcome to Place Explorer!`);
    });
}

// Get the Facebook info of user we are talking to
function getFBInfo(fbUserId) {
    console.log({
        fbUserId: fbUserId
    });
    return rp({
            method: 'GET',
            hostname: 'graph.facebook.com',
            path: `/v2.6/${fbUserId}?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=` + PAGE_ACCESS_TOKEN,
            port: 443
        })
        .then(response => {
            return JSON.parse(response.body);
        }).catch((error) => {
            return JSON.parse(error);
        });
}



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


function sendGenericMessage(sender) {
    let messageData = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                    "title": "First card",
                    "subtitle": "Element #1 of an hscroll",
                    "image_url": "http://messengerdemo.parseapp.com/img/rift.png",
                    "buttons": [{
                        "type": "web_url",
                        "url": "https://www.messenger.com",
                        "title": "web url"
                    }, {
                        "type": "postback",
                        "title": "Postback",
                        "payload": "Payload for first element in a generic bubble",
                    }],
                }, {
                    "title": "Second card",
                    "subtitle": "Element #2 of an hscroll",
                    "image_url": "http://messengerdemo.parseapp.com/img/gearvr.png",
                    "buttons": [{
                        "type": "postback",
                        "title": "Postback",
                        "payload": "Payload for second element in a generic bubble",
                    }],
                }]
            }
        }
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {
            access_token: token
        },
        method: 'POST',
        json: {
            recipient: {
                id: sender
            },
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

// spin spin sugar
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})


'use strict';

// Imports dependencies and set up http server
const 
  request = require('request'),
  express = require('express'),
  body_parser = require('body-parser'),
  firebase = require("firebase-admin"),
  app = express().use(body_parser.json()); 
  require('dotenv').config();


const PAGE_ACCESS_TOKEN = process.env.PAGE_TOKEN;
const port = process.env.PORT || 1337;
var userFont;
// Sets server port and logs message on success
app.listen(port || 1337, () => console.log('webhook is listening', port));

// Accepts GET requests at the /webhook endpoint
app.get('/webhook', (req, res) => {
  
  /** UPDATE YOUR VERIFY TOKEN **/
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
  
  // Parse params from the webhook verification request
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];  
    
  // Check if a token and mode were sent
  if (mode && token) {  
    // Check the mode and token sent are correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {      
      // Respond with 200 OK and challenge token from the request
      //console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);    
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);      
    }
  }
});
// Accepts POST requests at /webhook endpoint
app.post('/webhook', (req, res) => {  

  // Parse the request body from the POST
  let body = req.body; 

  // Check the webhook event is from a Page subscription
  if (body.object === 'page') {

    body.entry.forEach(function(entry) {

      // Gets the body of the webhook event
      let webhook_event = entry.messaging[0];
     // console.log(webhook_event);

      // Get the sender PSID
      let sender_psid = webhook_event.sender.id;  
      if (webhook_event.message) {
        if(webhook_event.message.quick_reply){
          handleQuickReply(sender_psid, webhook_event.message);
        }else{
          handleMessage(sender_psid, webhook_event.message);  
        }
             
      } else if (webhook_event.postback) {        
        handlePostback(sender_psid, webhook_event.postback);
      }
      
    });
    // Return a '200 OK' response to all events
    res.status(200).send('EVENT_RECEIVED');

  } else {
    // Return a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }

});

//Set up Get Started Button. To run one time
app.get('/setgsbutton',function(req,res){
    setupGetStartedButton(res);    
});

//Set up Persistent Menu. To run one time
app.get('/setpersistentmenu',function(req,res){
    setupPersistentMenu(res);    
});

//Remove Get Started and Persistent Menu. To run one time
app.get('/clear',function(req,res){    
    removePersistentMenu(res);
});



/**********************************************
Function to Handle when user send text message
***********************************************/

function handleMessage(sender_psid, received_message) {
  //let message;
  let response;
  let user_message = received_message.text;
  console.log(user_message);
      switch(user_message) {
        case "hi":
        case "Hi":
            greetUser(sender_psid);
          break;
        case "who am i":
            whoami(sender_psid);
          break;
        case "add":
        case "new":
            addTask(sender_psid);            
          break;
        case "view":
            viewTasks(sender_psid);
          break;
        case "attachment":
          response = {"text": `You sent the message: "${received_message.text}". Now send me an attachment!`};
          callSend(sender_psid, response);
          break;
        case "domestic":

          break;
        case "international":
          break;
        default:
            unknownCommand(sender_psid);
        }

}
/*********************************************
Function to handle when user click qick reply button
**********************************************/
function handleQuickReply(sender_psid, received_quickreply){
  console.log(received_quickreply.quick_reply.payload," qick reply");
  console.log(received_quickreply," qick reply");
}

/*********************************************
Function to handle when user click button
**********************************************/

function handlePostback(sender_psid, received_postback) {
  
  let response;
  // Get the payload for the postback
  let payload = received_postback.payload;
  console.log(payload," :payload type");
  if(payload.includes('/')){
    let userInput = payload.split('/');
    if(userInput.length==2){
      if(userInput[0]=="Inbound" || userInput[0]=="Outbound"){
        // var test = `${payload}/1`
        chooseUnit(sender_psid, payload);
        //let response = {"text":`${test}`};
        //callSend(sender_psid,response);
      }     
    }else{
      
      if(userInput[0]=="Inbound" || userInput[0]=="Outbound"){
        console.log(userFont);
        var unit = userInput[2];
        var date = userInput[1];
        date = date.split('!');
        var price = parseInt(date[2]) * parseInt(unit);
        let txt_title = userFont == 'zawgyi'? `Premium ေက်းမွာ ${price} ျဖစ္ပါသည္`:`Premium ကျေးမှာ ${price} ဖြစ်ပါသည်` ;
        let txt_purchase = userFont == 'zawgyi'? "ဝယ္မည္": "ဝယ်မည်";
        let response = {
          "attachment":{
            "type":"template",
            "payload":{
              "template_type":"generic",
              "elements":[
                {
                  "title": `${txt_title}`,
      
                  "buttons": [
                   
                   
                    {
                      "type":"web_url",
                      "url": `https://uatfni.glitch.me/transitionViber/${payload}`,
                      "title":`${txt_purchase}`
                    }
                    
                     
      
                  ]
                }
              ]
            }
          }
        }
     
        callSend(sender_psid,response);
      }  

    }

  }else{
    switch(payload.toLowerCase()) {
    
      case "hi":
          greetUser(sender_psid);
        break;  
      case "unicode":
      case "zawgyi":
          userFont = payload;
          travel(sender_psid);  
          break;
      case "travelinsure":
            choosetravelType(sender_psid);
        break;
      case "domestic":
        dateRangeforDomestic(sender_psid);
        break;
      case "international":
        dateRangeforInter(sender_psid);
        break;
      default:
          unknownCommand(sender_psid);
      }

  }

  


}
/**********************************************
All the Functions for all text messages
***********************************************/


function getUserProfile(sender_psid) {
  return new Promise(resolve => {
    request({
      "uri": "https://graph.facebook.com/"+sender_psid+"?fields=first_name,last_name,profile_pic&access_token=" + PAGE_ACCESS_TOKEN,
      "method": "GET"
      }, (err, res, body) => {
        if (!err) { 
          let data = JSON.parse(body);  
          resolve(data);                 
    } else {
      console.error("Error:" + err);
    }
    });
  });
}

function chooseUnit(sender_psid, payload){
  console.log(payload);
  let text = userFont =='zawgyi'? 'Unit ေ႐ြးခ်ယ္ပါ': 'Unit ရွေးချယ်ပါ';
  let response = {
    "attachment":{
      "type":"template",
      "payload":{
        "template_type":"generic",
        "elements":[
          {
            "title": `${text}`,

            "buttons": [
              {
                "type": "postback",
                "title": "1 Unit",
                "payload": `${payload}/1`,
              },
              {
                "type": "postback",
                "title": "2 Units",
                "payload":`${payload}/2`,
              },
              {
                "type": "postback",
                "title": "3 Units",
                "payload": `${payload}/3`,
              }
              

            ]
          },
          {
            "title": `${text}`,

            "buttons": [
             {
               "type": "postback",
               "title": "4 Units",
               "payload": `${payload}/4`,
             },
             
              {
                "type": "postback",
                "title": "5 unit",
                "payload": `${payload}/5`,
              },
              {
                "type": "postback",
                "title": "6 Units",
                "payload": `${payload}/6`,
              }
              

            ]
          },
          {
           "title":  `${text}`,

           "buttons": [
             {
               "type": "postback",
               "title": "7 Units",
               "payload": `${payload}/7`,
             },
             {
               "type": "postback",
               "title": "8 Units",
               "payload": `${payload}/8`,
             },


             {
               "type": "postback",
               "title": "9 Units",
               "payload":`${payload}/9`,
             }

           ]
         },
         {
          "title":  `${text}`,

          "buttons": [
            {
              "type": "postback",
              "title": "10 Units",
              "payload": `${payload}/10`,
            },
            {
              "type": "postback",
              "title": "11 Units",
              "payload": `${payload}/11`,
            },


            {
              "type": "postback",
              "title": "12 Units",
              "payload":`${payload}/12`,
            }

          ]
        },
        {
          "title":  `${text}`,

          "buttons": [
            {
              "type": "postback",
              "title": "13 Units",
              "payload": `${payload}/13`,
            },
            {
              "type": "postback",
              "title": "14 Units",
              "payload": `${payload}/14`,
            },


            {
              "type": "postback",
              "title": "15 Units",
              "payload":`${payload}/15`,
            }

          ]
        },
        {
          "title":  `${text}`,

          "buttons": [
            {
              "type": "postback",
              "title": "16 Units",
              "payload": `${payload}/16`,
            },
            {
              "type": "postback",
              "title": "17 Units",
              "payload": `${payload}/17`,
            },


            {
              "type": "postback",
              "title": "18 Units",
              "payload":`${payload}/18`,
            }

          ]
        },
        {
          "title":  `${text}`,

          "buttons": [
            {
              "type": "postback",
              "title": "19 Units",
              "payload": `${payload}/19`,
            },
            {
              "type": "postback",
              "title": "20 Units",
              "payload": `${payload}/20`,
            }
            

          ]
        }
        ]
      }
    }
  }


 callSend(sender_psid,response);
  


}

/***********************
ALL FUNCTIONS TO PAYLOAD HANDLER
************************/

function travel(sender_psid){
  let response1, response2;
  if(userFont == 'zawgyi'){
    response1 = {"text": "ေအာက္ပါအာမခံမ်ား ရရွိႏိုင္ပါသည္"};
    response2 = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "ခရီးသြားအာမခံ",
            "subtitle": "မိမိခရီးစဥ္အတြက္ အာမခံဝယ္ျခင္း",
            "image_url": "https://i.imgur.com/fewgWmV.png",
            "buttons": [
              {
                "type": "postback",
                "title": "ခရီးသြားအာမခံ",
                "payload": "travelinsure",
              },
            
            ],
          }]
        }
      }
    }
  }else{
    response1 = {"text": "အောက်ပါအာမခံများ ရရှိနိုင်ပါသည်"};
    response2 = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "ခရီးသွားအာမခံ",
            "subtitle": "မိမိခရီးစဉ်အတွက် အာမခံဝယ်ခြင်း",
            "image_url": "https://i.imgur.com/fewgWmV.png",
            "buttons": [
              {
                "type": "postback",
                "title": "ခရီးသွားအာမခံ",
                "payload": "travelinsure",
              },
            
            ],
          }]
        }
      }
    }
  }
  
  //callSend(sender_psid,response1);
  //callSend(sender_psid, response2);
  callSend(sender_psid, response1).then(()=>{
    return callSend(sender_psid, response2);
});
}
function choosetravelType (sender_psid){
  let response;
  if(userFont =="zawgyi"){
    response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "button",
          "text": "ခရီးစဥ္ေ႐ြးပါ",
          "buttons": [
              {
                "type": "postback",
                "title": "ျပည္တြင္း",
                "payload": "domestic",
              },
              {
                "type": "postback",
                "title": "ျပည္ပ",
                "payload": "international",
              }
            ]
        }
      }
    }
  }else{
    response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "button",
          "text": "ခရီးစဉ်ရွေးပါ",
          "buttons": [
              {
                "type": "postback",
                "title": "ပြည်တွင်း",
                "payload": "domestic",
              },
              {
                "type": "postback",
                "title": "ပြည်ပ",
                "payload": "international",
              }
            ]
        }
      }
    }
  }
      
  
  callSend(sender_psid,response);
}
function dateRangeforDomestic(sender_psid){
  //var travelduration = ['၁ ရက်!1!100', '၃ ရက်!3!150', '၁ ပါတ်!7!200', '၂ ပါတ်!14!250', '၁ လ!30!300', '၁ လ နှင့် ၁၅ ရက်!45!350', '၂ လ!60!400', '၂ လ နှင့် ၁၅ ရက်!75!450', '၃ လ!90!500'];
  let response;
  if(userFont=='zawgyi'){
    response = {
      "attachment":{
        "type":"template",
        "payload":{
          "template_type":"generic",
          "elements":[
            {
              "title": 'အာမခံကာလေ႐ြးခ်ယ္ပါ',
  
              "buttons": [
                {
                  "type": "postback",
                  "title": "၁ ရက္",
                  "payload": 'Inbound/၁ ရက္!1!100',
                },
                {
                  "type": "postback",
                  "title": "၃ ရက္",
                  "payload":"Inbound/၃ ရက္!3!150",
                },
                {
                  "type": "postback",
                  "title": "၁ ပါတ္",
                  "payload": 'Inbound/၁ ပါတ္!7!200',
                }
                
  
              ]
            },
            {
              "title": 'အာမခံကာလေ႐ြးခ်ယ္ပါ',
  
              "buttons": [
               {
                 "type": "postback",
                 "title": "၂ ပါတ္",
                 "payload": 'Inbound/၂ ပါတ္!14!250',
               },
               
                {
                  "type": "postback",
                  "title": "၁ လ",
                  "payload": 'Inbound/၁ လ!30!300',
                },
                {
                  "type": "postback",
                  "title": "၁ လ ႏွင့္ ၁၅ ရက္",
                  "payload": 'Inbound/၁ လ ႏွင့္ ၁၅ ရက္!45!350',
                }
                
  
              ]
            },
            {
             "title": 'အာမခံကာလေ႐ြးခ်ယ္ပါ',
 
             "buttons": [
               {
                 "type": "postback",
                 "title": "၂ လ",
                 "payload": 'Inbound/၂ လ!60!400',
               },
               {
                 "type": "postback",
                 "title": "၂ လ ႏွင့္ ၁၅ ရက္",
                 "payload": 'Inbound/၂ လ ႏွင့္ ၁၅ ရက္!75!450', 
               },
 
 
               {
                 "type": "postback",
                 "title": "၃ လ",
                 "payload": 'Inbound/၃ လ!90!500',
               }
 
             ]
           }
          ]
        }
      }
    }
  }else{
    response = {
      "attachment":{
        "type":"template",
        "payload":{
          "template_type":"generic",
          "elements":[
            {
              "title": 'အာမခံကာလရွေးချယ်ပါ',
  
              "buttons": [
                {
                  "type": "postback",
                  "title": "၁ ရက်",
                  "payload": 'Inbound/၁ ရက်!1!100',
                },
                {
                  "type": "postback",
                  "title": "၃ ရက်",
                  "payload":"Inbound/၃ ရက်!3!150",
                },
                {
                  "type": "postback",
                  "title": "၁ ပါတ်",
                  "payload": 'Inbound/၁ ပါတ်!7!200',
                }
                
  
              ]
            },
            {
              "title": 'အာမခံကာလရွေးချယ်ပါ',
  
              "buttons": [
               {
                 "type": "postback",
                 "title": "၂ ပါတ်",
                 "payload": 'Inbound/၂ ပါတ်!14!250',
               },
               
                {
                  "type": "postback",
                  "title": "၁ လ",
                  "payload": 'Inbound/၁ လ!30!300',
                },
                {
                  "type": "postback",
                  "title": "၁ လ နှင့် ၁၅ ရက်",
                  "payload": 'Inbound/၁ လ နှင့် ၁၅ ရက်!45!350',
                }
                
  
              ]
            },
            {
             "title": 'အာမခံကာလရွေးချယ်ပါ',
 
             "buttons": [
               {
                 "type": "postback",
                 "title": "၂ လ",
                 "payload": 'Inbound/၂ လ!60!400',
               },
               {
                 "type": "postback",
                 "title": "၂ လ နှင့် ၁၅ ရက်",
                 "payload": 'Inbound/၂ လ နှင့် ၁၅ ရက်!75!450', 
               },
 
 
               {
                 "type": "postback",
                 "title": "၃ လ",
                 "payload": 'Inbound/၃ လ!90!500',
               }
 
             ]
           }
          ]
        }
      }
    }
  }
  
 

  callSend(sender_psid,response);

}
function dateRangeforInter(sender_psid){
  let response;
  if(userFont =='zawgyi'){
    response = {
      "attachment":{
        "type":"template",
        "payload":{
          "template_type":"generic",
          "elements":[
            {
              "title": 'အာမခံကာလေ႐ြးခ်ယ္ပါ',
  
              "buttons": [
               
                {
                  "type": "postback",
                  "title": "၁ ပါတ္",
                  "payload": 'Outbound/၁ ပါတ္!7!200',
                },{
                  "type": "postback",
                  "title": "၂ ပါတ္",
                  "payload": 'Outbound/၂ ပါတ္!14!250',
                },
                
                 {
                   "type": "postback",
                   "title": "၁ လ",
                   "payload": 'Outbound/၁ လ!30!300',
                 },
                
  
              ]
            },
            {
              "title": 'အာမခံကာလေ႐ြးခ်ယ္ပါ',
  
              "buttons": [
               
                {
                  "type": "postback",
                  "title": "၁ လ ႏွင့္ ၁၅ ရက္",
                  "payload": 'Outbound/၁ လ ႏွင့္ ၁၅ ရက္!45!350',
                },
                {
                  "type": "postback",
                  "title": "၂ လ",
                  "payload": 'Outbound/၂ လ!60!400',
                },
                {
                  "type": "postback",
                  "title": "၂ လ ႏွင့္ ၁၅ ရက္",
                  "payload": 'Outbound/၂ လ ႏွင့္ ၁၅ ရက္!75!450', 
                }
                
  
              ]
            },
            {
             "title": 'အာမခံကာလေ႐ြးခ်ယ္ပါ',
  
             "buttons": [         
  
  
               {
                 "type": "postback",
                 "title": "၃ လ",
                 "payload": 'Outbound/၃ လ!90!500',
               }
  
             ]
           }
          ]
        }
      }
    }
  }else{
    response = {
      "attachment":{
        "type":"template",
        "payload":{
          "template_type":"generic",
          "elements":[
            {
              "title": 'အာမခံကာလရွေးချယ်ပါ',
  
              "buttons": [
               
                {
                  "type": "postback",
                  "title": "၁ ပါတ်",
                  "payload": 'Outbound/၁ ပါတ်!7!200',
                },{
                  "type": "postback",
                  "title": "၂ ပါတ်",
                  "payload": 'Outbound/၂ ပါတ်!14!250',
                },
                
                 {
                   "type": "postback",
                   "title": "၁ လ",
                   "payload": 'Outbound/၁ လ!30!300',
                 },
                
  
              ]
            },
            {
              "title": 'အာမခံကာလရွေးချယ်ပါ',
  
              "buttons": [
               
                {
                  "type": "postback",
                  "title": "၁ လ နှင့် ၁၅ ရက်",
                  "payload": 'Outbound/၁ လ နှင့် ၁၅ ရက်!45!350',
                },
                {
                  "type": "postback",
                  "title": "၂ လ",
                  "payload": 'Outbound/၂ လ!60!400',
                },
                {
                  "type": "postback",
                  "title": "၂ လ နှင့် ၁၅ ရက်",
                  "payload": 'Outbound/၂ လ နှင့် ၁၅ ရက်!75!450', 
                }
                
  
              ]
            },
            {
             "title": 'အာမခံကာလရွေးချယ်ပါ',
  
             "buttons": [         
  
  
               {
                 "type": "postback",
                 "title": "၃ လ",
                 "payload": 'Outbound/၃ လ!90!500',
               }
  
             ]
           }
          ]
        }
      }
    }
  }
 


 callSend(sender_psid,response);
}

/***********************
FUNCTION FOR UNKNOWN COMMAND 
************************/
function unknownCommand(sender_psid){
  let response = userFont=='zawgyi'?{"text": "ေတာင္းပန္ပါတယ္။ လူႀကီးမင္း ၏စာကိုနားမလည္ပါ။"}:{"text": "တောင်းပန်ပါတယ်။ လူကြီးမင်း ၏စာကိုနားမလည်ပါ။"};
  callSend(sender_psid,response);
}

/***********************
FUNCTION TO GREET USER 
************************/
async function greetUser(sender_psid){  
  let user = await getUserProfile(sender_psid);   
  let response;
  response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "button",
          "text": "Hello. "+user.first_name+" "+user.last_name+". Welcome to FNI. Choose Font?",
          "buttons": [
              {
                "type": "postback",
                "title": "Unicode",
                "payload": "unicode",
              },
              {
                "type": "postback",
                "title": "Zawgyi Font",
                "payload": "zawgyi",
              }
            ]
        }
      }
    }
  callSendAPI(sender_psid, response);
}






/***********************
Calling API 
************************/

function callSendAPI(sender_psid, response) {  
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }
  
  return new Promise(resolve => {
    request({
      "uri": "https://graph.facebook.com/v2.6/me/messages",
      "qs": { "access_token": PAGE_ACCESS_TOKEN },
      "method": "POST",
      "json": request_body
    }, (err, res, body) => {
      if (!err) {
        resolve('message sent!')
      } else {
        console.error("Unable to send message:" + err);
      }
    }); 
  });
}

async function callSend(sender_psid, response){
  let send = await callSendAPI(sender_psid, response);
  return 1;
}
//////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////// start of one time used function //////////////////
/////////////////////////////////////////////////////////////////////////////////////

/*************************************
FUNCTION TO SET UP GET STARTED BUTTON
**************************************/

function setupGetStartedButton(res){
  let messageData = 
  { "get_started": {"payload": "Hi"},     
  "greeting": [{
  "locale":"default",
  "text":"Hello {{user_first_name}}! \n FNI Insurance မှကြိုစိုပါသည်။ \nGet Started ကိုနှိပ်ပေးပါ'" 
}]
}

  request({
      url: 'https://graph.facebook.com/v2.6/me/messenger_profile?access_token='+ PAGE_ACCESS_TOKEN,
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      form: messageData
    },
    function (error, response, body) {
      if (!error && response.statusCode == 200) {        
        res.send(body);
      } else { 
        // TODO: Handle errors
        res.send(body);
      }
  });
} 
/**********************************
FUNCTION TO SET UP PERSISTENT MENU
***********************************/

function setupPersistentMenu(res){
  var messageData = { 
      "persistent_menu":[
          {
            "locale":"default",
            "composer_input_disabled":false,
            "call_to_actions":[
                {
                  "type":"postback",
                  "title":"View My Tasks",
                  "payload":"view-tasks"
                },
                {
                  "type":"postback",
                  "title":"Add New Task",
                  "payload":"add-task"
                },
                {
                  "type":"postback",
                  "title":"Cancel",
                  "payload":"cancel"
                }
          ]
      },
      {
        "locale":"zh_CN",
        "composer_input_disabled":false
      }
    ]          
  };
        
  request({
      url: 'https://graph.facebook.com/v2.6/me/messenger_profile?access_token='+ PAGE_ACCESS_TOKEN,
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      form: messageData
  },
  function (error, response, body) {
      if (!error && response.statusCode == 200) {
          res.send(body);
      } else { 
          res.send(body);
      }
  });
} 
/***********************
FUNCTION TO REMOVE MENU
************************/

//Remove Get Started and Persistent Menu. To run one time
app.get('/clear',function(req,res){    
  removePersistentMenu(res);
});

function removePersistentMenu(res){
  var messageData = {
          "fields": [
             "persistent_menu" ,
             "get_started"                 
          ]               
  };  
  request({
      url: 'https://graph.facebook.com/v2.6/me/messenger_profile?access_token='+ PAGE_ACCESS_TOKEN,
      method: 'DELETE',
      headers: {'Content-Type': 'application/json'},
      form: messageData
  },
  function (error, response, body) {
      if (!error && response.statusCode == 200) {          
          res.send(body);
      } else {           
          res.send(body);
      }
  });
} 



app.get('/setgsbutton',function(req,res){
  setupGetStartedButton(res);    
});
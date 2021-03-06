const Web3 = require('web3');
const UI = require('./ui');

// Useful constants
const DEFAULT_CHANNEL = "default";
const DEFAULT_TOPIC = "0x11223344";
const PRIVATE_MESSAGE_REGEX = /^\/msg (0x[A-Za-z0-9]{130}) (.*)$/;

const POW_TIME = 100;
const TTL = 20;
const POW_TARGET = 2;

(async () => {
    // TODO: Web3 connection
    const web3 = new Web3();
    try {
        //web3.setProvider(new Web3.providers.WebsocketProvider("ws://172.17.0.2:8687", {headers: { Origin: "mychat"}}));
        //var web3 = new Web3.providers.WebsocketProvider("ws://172.17.0.2:8545");
        //var web3 = new Web3.providers.WebsocketProvider("ws://172.17.0.2:8687", {headers: { Origin: "mychat"}});
        //var web3 = new Web3(new Web3.providers.HttpProvider('http://172.17.0.2:8545'));
        //var web3 = new Web3(new Web3.providers.HttpProvider('http://172.17.0.2:8545'));
        web3.setProvider(new Web3.providers.WebsocketProvider("ws://172.17.0.2:8687", {headers: { Origin: "mychat"}}));
        //await web3.eth.getAccounts().then(console.log);
        //await web3.shh.newKeyPair().then(console.log);

        //console.log(web3.shh);
        //await web3.eth.net.isListening();
    } catch (err){
        console.log(err);
        process.exit();
    }

    const ui = new UI();

    // TODO: Generate keypair
    const keyPair = await web3.shh.newKeyPair();

    // TODO: Obtain public key
    const pubKey = await web3.shh.getPublicKey(keyPair);

    ui.setUserPublicKey(pubKey);

    // TODO: Generate a symmetric key
    const channelSymKey = await web3.shh.generateSymKeyFromPassword(DEFAULT_CHANNEL);

    const channelTopic = DEFAULT_TOPIC;

    ui.events.on('cmd', async (message) => {
        try {
            if(message.startsWith('/msg')){
                if(PRIVATE_MESSAGE_REGEX.test(message)){
                    const msgParts = message.match(PRIVATE_MESSAGE_REGEX);
                    const contactCode = msgParts[1];
                    const messageContent = msgParts[2];

                    // TODO: Send private message
                    web3.shh.post({
                        pubKey: contactCode,
                        sig: keyPair,
                        ttl: TTL,
                        topic: channelTopic,
                        payload: web3.utils.fromAscii(messageContent),
                        powTime: POW_TIME,
                        powTarget: POW_TARGET
                    });

                    // Since it is a private message, we need to display it in the UI
                    ui.addMessage(pubKey, messageContent, true);
                }
            } else {
                // TODO: Send a public message
               web3.shh.post({
                   symKeyID: channelSymKey,
                   sig: keyPair,
                   ttl: TTL,
                   topic: channelTopic,
                   payload: web3.utils.fromAscii(message),
                   powTime: POW_TIME,
                   powTarget: POW_TARGET
               });

            }
        } catch(err) {
            console.log(err);
                console.log("cmd");
            ui.addError("Couldn't send message: " + err.message);
        }
    });

    // TODO: Subscribe to public chat messages
    web3.shh.subscribe("messages", {
        minPow: POW_TARGET,
        symKeyID: channelSymKey,
        topics: [channelTopic]
    }).on('data', (data)=>{
        ui.addMessage(data.sig, web3.utils.toAscii(data.payload));
    }).on('error', (err) => {
            console.log("public messages");
        ui.addError("Couldn't decode message: " + err.message);
    });

    // TODO: Subscribe to private messages
    web3.shh.subscribe("messages", {
        minPow: POW_TARGET,
        privateKeyID: keyPair,
        topics: [channelTopic]
    }).on('data', (data) => {
        ui.addMessage(data.sig, web3.utils.toAscii(data.payload), true);
    }).on('error', (err) => {
            console.log("private messages");
        ui.addError("Couldn't decode message: " + err.message)
    })

})();
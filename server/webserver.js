const WebSocketServer = require('websocket').server;
const http = require('http');
const fs = require('fs');
const primaryStorage = {
	questions: null,
	answers: null
}
const maxAnswersInHand = 5;
let updateTimer = null;
const sendQueue = [];
const updateInterval = 10;
fs.readFile(__dirname+'/data/questions.data', function(err, data) {
	primaryStorage.questions = parseCSVIntoData(data.toString('utf8'));
	console.log('loaded question data');
})
fs.readFile(__dirname+'/data/answers.data', function(err, data) {
	primaryStorage.answers = parseCSVIntoData(data.toString('utf8'));
	console.log('loaded answer data');
})
const websocketPort = 3001;
const games = {};
const gamesByHost = {};

var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});
server.listen(websocketPort, function() {
    console.log((new Date()) + ' Server is listening on port '+websocketPort);
});

wsServer = new WebSocketServer({
    httpServer: server
});

wsServer.on('request', function(request) {
	//console.log('request received', request);
	const connection = request.accept(null, request.origin); 
	console.log('got a request');
	let gameCode = null;
	let playerID = Date.now();
	connection.on('message', message => {
		const data = JSON.parse(message.utf8Data);
		//console.log('got a message',message);
		let response;
		switch(data.type){
			case 'join':
				gameCode = data.message.game;
				response = joinGame(data.message, playerID, connection);
				sendPacket(connection, response);
				if(!response.success){
					connection.close()
				} 
				break;
			case 'create':
				gameCode = data.message.game;
				response = createGame(data.message, playerID, connection);

				sendPacket(connection, response);
				if(!response.success){
					connection.close()
				} 
				break;
		}	
		
	});
	connection.on('close', function(connection) {
		console.log('deleting ');
		if(games[gameCode]){
			delete games[gameCode].playersByID[playerID];
			let remaining = Object.keys(games[gameCode].playersByID);
			if(remaining.length===0){
				delete games[gameCode];
				console.log('no more players, removing game '+gameCode);
			}
			console.log('*'.repeat(50))			
		}

		

    });
});

function sendPacket(conn, data){
	console.log('sending ',data);
	conn.sendUTF( JSON.stringify( data ));
}
function createPlayerObject( playerData, playerID, connection ){
	const date = new Date()
	return { 
		id: playerID,
		name: playerData.name, 
		answers: [],
		questions: [],
		connection: connection,
		connected: date,
		connectedMT: date.getTime(),
		score: 0
	}
}
function joinGame(gameData, playerID, conn){
	//console.log('***gameData: ', gameData);
	if(!games[gameData.game]){
		return {success: false, message: 'that game does not exist', action:'error'}
	}
	const player = createPlayerObject(gameData.playerData,playerID, conn);
	//console.log("PLAYER LENGth: ",games[gameData.game])
	games[gameData.game].playersByID[playerID] = player;
	addPlayerData(player, games[gameData.game], 'answers',maxAnswersInHand);
	// setTimeout(function(){
	//  selectJudge(games[gameData.game]);
	// }, 500);
	const allPlayers = Object.keys(games[gameData.game].playersByID);
	enqueueDataSend(game, {data: { message:`Currently waiting: ${allPlayers.join(', ')}`}} , players);
	return {success: true, message: 'game joined', action: 'join', data:{ 
		gameCode: gameData.game,
		answers: player.answers,
		userID: playerID,
		players: allPlayers,
		message: `Currently waiting: ${allPlayers.join(', ')}`,
		mode: 'waiting'
	 }}	
}
function enqueueDataSend(game, data, playerList ){
	const boundFunction = sendToPlayerList.bind(null, game, data, playerList);
	sendQueue.push(boundFunction);
	if(updateTimer===null){
		updateTimer = setInterval(handleQueueSend);
	}
}
function handleQueueSend( ){
	if(sendQueue.length>0){
		sendQueue.shift()[0]();
		if(sendQueue.length===0){
			clearInterval(updateTimer);
			updateTimer = null;
		}
	}
}
function sendToPlayerList( game, data, playerList ){
	playerList.forEach( playerID => {
		sendPacket( game.playersByID[playerID].connection, {
			data: data
		});
	})	
}

function selectJudge( game ){
	const players = Object.keys(game.playersByID);
	let randomIndex = (players.length * Math.random())>>0;
	judge = game.playersByID[players[randomIndex]];	
	players.splice( randomIndex, 1);
	sendPacket(judge.connection, {
		data: {mode: 'judge'}
	});
	players.forEach( playerID => {
		sendPacket( game.playersByID[playerID].connection, {
			data: {mode: 'player'}
		});
	})
}

function addPlayerData(player, game, type, count){
	player[type].splice( player[type].length-1, 0, ...getXRandomItems(game[type],count))
}
function createGame(gameData, playerID, conn){
	console.log('***gameData: ', gameData);
	if(games[gameData.game]){
		return {success: false, message: 'that game already exists'}
	}
	gameData.playerData.connection = conn;

	const player = createPlayerObject(gameData.playerData, playerID, conn);
	games[gameData.game] = {
		gameStarted: new Date(),
		lastRound: new Date(),
		creator: player,
		playersByConnection: new Map([[conn, player]]),
		playersByID: { [playerID]: player},
		questions: primaryStorage.questions.slice(),
		answers: primaryStorage.answers.slice(),
		currentHost: player,
		currentQuestion: null,
		currentSubmissions: new Map(),
	}
	addPlayerData(player, games[gameData.game], 'answers',maxAnswersInHand);
	//player.answers.splice( player.answers.length-1, 0, ...getXRandomItems(games[gameData.game].answers,maxAnswersInHand))
	gamesByHost[playerID] = games[gameData.game];
	return {success: true, action: 'start', data:{ 
		gameCode: gameData.game,
		answers: player.answers,
		userID: playerID,
		message: 'game created, waiting for players',
		mode: games[gameData.game].playersByConnection.length>1 ? 'guest': 'waiting'
	 }}
}

function parseCSVIntoData(cvs){
	const dataArray = cvs.split("\n");
	return dataArray;
}

function getXRandomItems(array, count){
	const output = [];
	while(count){
		let randomIndex = (Math.random() * array.length)>>0;
		output.push( array.splice(randomIndex,1)[0]);
		count--;
	}
	return output;
}







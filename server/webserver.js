var WebSocketServer = require('websocket').server;
var http = require('http');
const websocketPort = 3001;
const games = {};

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
	console.log('request received', request);
	const connection = request.accept(null, request.origin); 
	console.log('got a request');
	let name = null;
	connection.on('message', message => {
		const data = JSON.parse(message.utf8Data);
		//console.log('got a message',message);
		switch(data.type){
			case 'join':
				break;
			case 'create':
				createGame(data.message);
				break;
		}		
	});
});
function createPlayerObject( playerData ){
	return { 
		name: playerData.name, 
		connection: playerData.connection, 
		connected: new Date(),
		score: 0
	}
}
function joinGame(gameData){
	if(!games[gameData.game]){
		return {success: false, message: 'that game does not exist'}
	}
	const player = createPlayerObject(gameData.playerData);
	games[gameData.game].players.push([[player],[player]]);
}

function createGame(gameData){
	//console.log(gameData);
	if(games[gameData.game]){
		return {success: false, message: 'that game already exists'}
	}
	const player = createPlayerObject(gameData.playerData);
	games[gameData.game] = {
		gameStarted: new Date(),
		lastRound: new Date(),
		creator: player,
		players: new Map([[player, player]]),
		questions: [],
		answers: [],
		currentHost: player,
		currentQuestion: null,
		currentSubmissions: new Map(),

	}
	console.log(games);
}
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
		let gamePlayerData;
		switch(data.type){
			case 'join':
				gameCode = data.message.game;
				response = joinGame(data.message, playerID, connection);
				// sendPacket(connection, response);
				// if(!response.success){
				// 	connection.close()
				// } 
				break;
			case 'create':
				gameCode = data.message.game;
				response = createGame(data.message, playerID, connection);
				// sendPacket(connection, response);
				// if(!response.success){
				// 	connection.close()
				// } 
				break;
			case 'ready':
				games[gameCode].playersByID[playerID].ready = !games[gameCode].playersByID[playerID].ready;

				gamePlayerData = getPlayerDataFromGame(gameCode );
				if(gamePlayerData.readyStates.length> 1 
					&& 
					gamePlayerData.readyStates.reduce( (acc, state) => state+acc) 
						=== 
					gamePlayerData.readyStates.length){
					selectJudge( games[gameCode] );
				} else {

					enqueueDataSend(games[gameCode], { 
						message:`Currently waiting`,
						playerIDs: gamePlayerData.playerIDs,
						players: gamePlayerData.names,
						readyStates: gamePlayerData.readyStates		
					} , gamePlayerData.playerIDs);
				}	
				break;
			case 'chooseAnswers':
				games[gameCode].playersByID[playerID].selectedAnswers = data.message.playerData.chosenAnswers;
				gamePlayerData = getPlayerDataFromGame(gameCode );
				if(games[gameCode].playersByID[playerID].selectedAnswers.length !== games[gameCode].questionRequiredAnswers){
					enqueueDataSend(games[gameCode], { 
						mode: 'player',
						cardReadyStates: gamePlayerData.cardReadyStates	
					} , [playerID]);						
				}
				else {
					if(gamePlayerData.cardReadyStates.filter( state=>state).length ===gamePlayerData.names.length){
						//all the players have indicated they are ready
						games[gameCode].allChosenAnswers = games[gameCode].nonJudgePlayers.map( id=> games[gameCode].playersByID[id].selectedAnswers.map( qID => games[gameCode].playersByID[id].answers[qID]))
						enqueueDataSend(games[gameCode], { 
							message:`choosing cards`,
							mode: 'judgeSelecting',
							cardSelections: games[gameCode].allChosenAnswers,	//don't like this because if they know the order that players joined, this would reveal who gave what
						} , [games[gameCode].currentJudge]);
						enqueueDataSend(games[gameCode], { 
							message:`${games[gameCode].playersByID[playerID].name} is picking`,
							mode: 'waitingForJudge',
							cardReadyStates: gamePlayerData.cardReadyStates	
						} , games[gameCode].nonJudgePlayers );
					} else{
						games[gameCode].playersByID[playerID].mode = 'cardWaiting';
						enqueueDataSend(games[gameCode], { 
							message:`waiting for card submissions`,
							mode: 'cardWaiting',
							cardReadyStates: gamePlayerData.cardReadyStates	
						} , [playerID]);	
							
	
						enqueueDataSend(games[gameCode], { 
							playerIDs: gamePlayerData.playerIDs,
							players: gamePlayerData.names,
							readyStates: gamePlayerData.readyStates,
							cardReadyStates: gamePlayerData.cardReadyStates	
						} , gamePlayerData.playerIDs);							
					}

				}
				break;
			case 'playerAnswerChosen':
				let winnerIndex = data.message.playerData.chosenAnswer;
				let winnerID = games[gameCode].nonJudgePlayers[winnerIndex];
				games[gameCode].roundWinner = games[gameCode].playersByID[winnerID];
				games[gameCode].roundWinner.score++;
				for(var id in games[gameCode].playersByID){
					games[gameCode].playersByID[id].ready = false;
				}
				gamePlayerData = getPlayerDataFromGame(gameCode );
				enqueueDataSend(games[gameCode], { 
					scores: gamePlayerData.scores,
					mode: 'winnerAnnounce',
					message: `${games[gameCode].roundWinner.name} was the winner.  Click again to play again, or quit to leave the game`
				} , gamePlayerData.playerIDs);
				break;
			case 'waitingToContinue':
				games[gameCode].playersByID[playerID].ready = true;

				gamePlayerData = getPlayerDataFromGame(gameCode );
				if(gamePlayerData.readyStates.length> 1 
					&& 
					gamePlayerData.readyStates.reduce( (acc, state) => state+acc) 
						=== 
					gamePlayerData.readyStates.length){
					games[gameCode].currentQuestion.length=0;//reset the question to nothing, it will be filled in selectJudge
					games[gameCode].nonJudgePlayers
						.forEach( currentPlayerID => games[gameCode].playersByID[currentPlayerID].answers = games[gameCode].playersByID[currentPlayerID].answers
							.filter( (text,index)=>(games[gameCode].playersByID[currentPlayerID].selectedAnswers.indexOf(index)===-1)));
					games[gameCode].nonJudgePlayers.forEach( id=> {
							addPlayerData(games[gameCode].answers, games[gameCode].playersByID[id].answers ,maxAnswersInHand - games[gameCode].playersByID[id].answers.length)
							enqueueDataSend(games[gameCode], { 
								answers: games[gameCode].playersByID[id].answers
							}, id );
						}
					)
					gamePlayerData.playerIDs.forEach( id=> games[gameCode].playersByID[id].selectedAnswers = []);

					selectJudge( games[gameCode],games[gameCode].roundWinner.id );

				} else {
					const readyPlayersByID = Object.keys(games[gameCode].playersByID).filter( (id) => games[gameCode].playersByID[id].ready);

					enqueueDataSend(games[gameCode], { 
						mode: 'waiting',
						message:`Currently waiting`,
						playerIDs: gamePlayerData.playerIDs,
						players: gamePlayerData.names,
						readyStates: gamePlayerData.readyStates		
					} , readyPlayersByID);
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
		name: playerData.name || playerID, 
		answers: [],
		questions: [],
		selectedAnswers: [],
		ready: false,
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
	addPlayerData(games[gameData.game].answers, player.answers,maxAnswersInHand);
	// setTimeout(function(){
	//  selectJudge(games[gameData.game]);
	// }, 500);
	const gamePlayerData = getPlayerDataFromGame(gameData.game );
	//const allPlayers = Object.keys(games[gameData.game].playersByID);
	//const allNames = allPlayers.map( id => games[gameData.game].playersByID[id].name);
	enqueueDataSend(games[gameData.game], { 
		gameCode: gameData.game,
		answers: player.answers,
		userID: playerID,
		playerIDs: gamePlayerData.playerIDs,
		players: gamePlayerData.names,
		readyStates: gamePlayerData.readyStates,
		message: `Currently waiting: `,
		mode: 'waiting'
	 }, [playerID])
	enqueueDataSend(games[gameData.game], { 
		message:`Currently waiting`,
		playerIDs: gamePlayerData.playerIDs,
		players: gamePlayerData.names,
		readyStates: gamePlayerData.readyStates		
	} , gamePlayerData.playerIDs);
	// return {success: true, message: 'game joined', action: 'join', data:{ 
	// 	gameCode: gameData.game,
	// 	answers: player.answers,
	// 	userID: playerID,
	// 	players: allPlayers,
	// 	message: `Currently waiting: ${allPlayers.join(', ')}`,
	// 	mode: 'waiting'
	//  }}	
}
function getPlayerDataFromGame( gameCode, asParallelArrays=true ){
	const allPlayers = Object.keys(games[gameCode].playersByID);
	if(asParallelArrays){
		return {
			playerIDs: allPlayers,
			names: allPlayers.map( id => games[gameCode].playersByID[id].name),
			readyStates: allPlayers.map( id => games[gameCode].playersByID[id].ready),
			cardReadyStates: allPlayers.map( id => games[gameCode].questionRequiredAnswers === games[gameCode].playersByID[id].selectedAnswers.length),
			scores: allPlayers.map( id => ({name: games[gameCode].playersByID[id].name, score: games[gameCode].playersByID[id].score}))
		}
	} 
	return allPlayers.map( id => ({ id, name: games[gameCode].playersByID[id].name, ready: games[gameCode].playersByID[id].ready}));
	
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
		sendQueue.shift()();
		if(sendQueue.length===0){
			clearInterval(updateTimer);
			updateTimer = null;
		}
	}
}
function sendToPlayerList( game, data, playerList ){
	if(!Array.isArray(playerList)){
		playerList = [playerList];
	}
	playerList.forEach( playerID => {
		sendPacket( game.playersByID[playerID].connection, {
			data: data
		});
	})	
}

function selectJudge( game, nextJudgeID=null ){
	const allPlayers = Object.keys(game.playersByID);
	const onlyPlayers = allPlayers.slice();
	let judge;
	let judgeIndex;
	if(nextJudgeID===null){
		judgeIndex = (allPlayers.length * Math.random())>>0;
		judge = game.playersByID[allPlayers[judgeIndex]];	
		
	} else {
		judge = game.playersByID[nextJudgeID];
		judgeIndex = allPlayers.indexOf(nextJudgeID+'');
	}
	game.currentJudge = judge.id;
	addPlayerData(game.questions, game.currentQuestion,1);
	parseQuestion(game);
	judge.selectedAnswers = (new Array(game.questionRequiredAnswers)).fill(true)
	enqueueDataSend(game, { questions: [game.currentQuestion], answersRequired: game.questionRequiredAnswers, currentAnswers: game.currentAnswers}, allPlayers);
	onlyPlayers.splice( judgeIndex, 1);
	enqueueDataSend(game,  {mode: 'judge'}	, [judge.id]);
	// sendPacket(judge.connection, {
	// 	data: {mode: 'judge'}
	// });
	game.nonJudgePlayers = onlyPlayers;
	enqueueDataSend(game, {mode: 'player'}, onlyPlayers);
	// players.forEach( playerID => {
	// 	sendPacket( game.playersByID[playerID].connection, {
	// 		data: {mode: 'player'}
	// 	});
	// })
}

function parseQuestion(game){
	const pieces = game.currentQuestion[0].split('_');
	let requiredAnswers = game.currentQuestion[0].match(/(_)/g);
	if(requiredAnswers===null){ 
		game.questionRequiredAnswers = 1;
	} else {
		game.questionRequiredAnswers = requiredAnswers.length;
	}
	if(game.questionRequiredAnswers===0){
		pieces.push('_');
		game.questionRequiredAnswers=1;
	}
	
	game.currentAnswers = (new Array(game.questionRequiredAnswers)).fill('_');
	const outputPieces = [];
	pieces.forEach( (item,index) => outputPieces.push(item, index));
	outputPieces.pop();
	game.currentQuestion = outputPieces;
}

function addPlayerData(source, destination, count){
	destination.splice( source.length-1, 0, ...getXRandomItems(source,count))
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
		currentQuestion: [],
		currentJudge: null,
		questionRequiredAnswers: null,
		answers: primaryStorage.answers.slice(),
		currentHost: player,
		currentAnswers:[],
		nonJudgePlayers: null,
		currentSubmissions: new Map(),
		allChosenAnswers: null,
		roundWinner: null
	}
	addPlayerData(games[gameData.game].answers, player.answers ,maxAnswersInHand);
	//player.answers.splice( player.answers.length-1, 0, ...getXRandomItems(games[gameData.game].answers,maxAnswersInHand))
	gamesByHost[playerID] = games[gameData.game];
	// return {success: true, action: 'start', data:{ 
	// 	gameCode: gameData.game,
	// 	answers: player.answers,
	// 	userID: playerID,
	// 	message: 'game created, waiting for players',
	// 	mode: games[gameData.game].playersByConnection.length>1 ? 'guest': 'waiting'
	//  }}
	enqueueDataSend(games[gameData.game], { 
		gameCode: gameData.game,
		answers: player.answers,
		userID: playerID,
		playerIDs: [playerID],
		players: [gameData.playerData.name],
		readyStates: [false],
		message: 'game created, waiting for players',
		mode: games[gameData.game].playersByConnection.length>1 ? 'guest': 'waiting'
	 }, [playerID]);
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







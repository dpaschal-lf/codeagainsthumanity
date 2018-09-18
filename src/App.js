import React, { Component } from 'react';
import './App.css';
import EntryMenu from './components/entrymenu/entrymenu';
import WebSocketClient from './components/websocketclient/websocketclient';



class App extends Component {
  constructor(props){
    super(props);
    this.address = `ws://${window.location.hostname}:3001`;
    this.server = new WebSocketClient(this.address);
    this.state = {
    	gameCode: 'abc123',
    	server: null,
    	host: [

    	],
    	guest: [
    	],
    	userID: (new Date()).getTime()
    }
    this.sendMessage = this.sendMessage.bind(this);
    this.receiveMessage = this.receiveMessage.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleOpen = this.handleOpen.bind(this);
    this.createGame = this.createGame.bind(this);
  }
  componentDidMount(questionURL){
  	this.loadCSVToArray('questions.txt', 'host');
  	this.loadCSVToArray('answers.txt', 'guest');
  	this.server.send
  }
  static getDerivedStateFromProps(props ,state){
  	console.log('update', state);
  	return null;
  }
  loadCSVToArray(url, stateKey){
  	console.log('getting url'+ url)
  	fetch(url)
  		.then((data)=>{ data.text()
	  		.then( 
	  			data=> {
	  				console.log('data received')
	  				var dataArray = data.split("\n");
	  				this.setState({
	  					[stateKey]: dataArray
	  				})
	  			}
	  		)
	  	});
  }
  sendMessage(){
  	console.log('message sent');
  	this.server.send('test');
  }
  receiveMessage(packet){
  	console.log('got a message');
  }
  handleOpen(){
  	console.log('ws open');
  }
  handleClose(){
  	console.log('ws close');
  }
  joinGame(code){
  	this.server.send({type:'join', game: code});
  }
  createGame(){
  	this.server.send({
  		game: this.state.gameCode, 
  		playerData: { 
  			name: this.state.userID
  		}
  	}, 'create')
  }
  render() {

    return (
      <div className="App">
      	<EntryMenu />
      	<div onClick={this.createGame}>click</div>
      </div>
    );
  }
}

export default App;











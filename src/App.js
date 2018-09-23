import React, { Component } from 'react';
import './App.css';
import EntryMenu from './components/entrymenu/entrymenu';
import WebSocketClient from './components/websocketclient/websocketclient';
import Waiting from './components/waiting/waiting';


class App extends Component {
  constructor(props){
    super(props);

    this.state = {
    	gameCode: 'abc123',
    	server: null,
    	mode: 'noop',
    	questions: [

    	],
    	answers: [
    	],
    	userID: null
    }
    this.sendMessage = this.sendMessage.bind(this);
    this.receiveMessage = this.receiveMessage.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleOpen = this.handleOpen.bind(this);
    this.createGame = this.createGame.bind(this);
    this.joinGame = this.joinGame.bind(this);
    this.mode_join = this.mode_join.bind(this);
    this.mode_waiting = this.mode_waiting.bind(this);

    this.address = `ws://${window.location.hostname}:3001`;
    this.server = new WebSocketClient(this.address, {
		onmessage: this.receiveMessage,
		onopen:this.handleOpen,
		onclose:this.handleClose,   	
    });
  }
  componentDidMount(questionURL){
  	//this.loadCSVToArray('questions.txt', 'host');
  	//this.loadCSVToArray('answers.txt', 'guest');
  	this.setState({ mode: 'join'})
  }
  static getDerivedStateFromProps(props ,state){
  	console.log('update', state);
  	return null;
  }
  mode_noop(){
  	console.log('noop');
  }
  mode_join(){
  	return(   
      	<EntryMenu create={this.createGame} join={this.joinGame}/>	
    )
  }
  mode_judge(){
  	return ( <div>judge</div>);
  }
  mode_player(){
  	return ( <div>player</div>);
  }
  mode_waiting(){
  	return(
  		<Waiting message={this.state.message}/>
  	)
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
  	console.log('app message sent');
  	this.server.send('test');
  }
  receiveMessage(packet){
  	const validStateKeys = ['message','mode','userID', 'gameCode', 'questions','answers','name'];
  	for(let key in packet.data){
  		if(validStateKeys.indexOf(key)===-1){
  			delete packet.data[key];
  		}
  	}
  	console.log('state updating from message ', packet.data)
  	this.setState({...packet.data});
  	// switch( packet.action ){
  	// 	case 'start':
  	// 	case 'join':
  			
  	// 		break;
  	// }
  }
  handleOpen(){
  	console.log('app ws open');
  }
  handleClose(){
  	console.log('app ws close');
  }
  joinGame(){
  	console.log('join');
  	this.server.send({
  		game: this.state.gameCode, 
  		playerData: { 
  			name: this.state.userID
  		}
  	}, 'join')
  }
  createGame(){
  	console.log('create');
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
  			{this['mode_'+this.state.mode]()}
  		</div>
  	)
  }
}

export default App;











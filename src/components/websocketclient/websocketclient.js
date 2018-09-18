class WebSocketServer{
	constructor( address, callbacks={} ){
		const defaults = {
			onmessage: ()=>{},
			onopen:()=>{},
			onclose:()=>{},
		}
		this.callbacks = {};
		for(let key in defaults){
			this.callbacks[key] = callbacks[key] || defaults[key];
		}
		this.address = address;
		console.log('connecting to '+address);
		this.server = new WebSocket(address);	
		this.server.onopen = this.onopen.bind(this);
		this.server.onmessage = this.onmessage.bind(this);	
		this.server.onclose = this.onclose.bind(this);
	}
	onopen(){
		console.log('connection opened');
		this.callbacks.onopen();
		//this.server.send(JSON.stringify({ type: 'connect', location: this.livePlayer.location, name: this.livePlayer.name}));
	}
	onmessage(evt){
		let message = evt.data;
		message = JSON.parse(message);
		this.callbacks.onmessage(message);
	}
	onclose(){ 
      // websocket is closed.
 		console.log('connection closed'); 
 		this.callbacks.onclose();
   };
   	send(message, type){
   		const packet = { type, message};
   		this.server.send( JSON.stringify(packet));
   	}
}

export default WebSocketServer;
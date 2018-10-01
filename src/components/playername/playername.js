import React, { Component } from 'react';
import './playername.css';

class PlayerName extends Component{
	render(){
		console.log("playername entry props",this.props);
		return (<div className={this.props.ready?'ready name':'name'}>
			{this.props.name}
		</div>);
	}
}

export default PlayerName;
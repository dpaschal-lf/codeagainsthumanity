import React, { Component } from 'react';
import './entrymenu.css';

class EntryMenu extends Component{
	render(){
		console.log("entry props",this.props);
		return (<div>
			<div className="join-create-menu">
				<div className="createButton" onClick={this.props.create}>CREATE</div>
				<div className="joinButton" onClick={this.props.join}>JOIN</div>
			</div>
		</div>);
	}
}

export default EntryMenu;
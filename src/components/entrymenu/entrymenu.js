import React, { Component } from 'react';
import './entrymenu.css';

class EntryMenu extends Component{
	render(){
		return (<div>
			<div className="join-create-menu">
				<div className="createButton">CREATE</div>
				<div className="joinButton">JOIN</div>
			</div>
		</div>);
	}
}

export default EntryMenu;
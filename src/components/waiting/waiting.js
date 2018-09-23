import React, { Component } from 'react';
import './waiting.css';

class Waiting extends Component{
	constructor(props){
		super(props)
		this.maxDots = this.props.dots || 3;
		this.state= {
			dots : this.maxDots,
			timer: null,
			updateInterval: this.props.interval || 1000
		}
	}
	componentDidMount(){
		this.setState(
		{
			timer: setInterval( this.updateDots.bind(this), this.state.updateInterval)
		});
	}
	componentWillUnmount(){
		console.log('cleaning up');
		clearInterval(this.state.timer);
	}
	updateDots(){
		this.setState({
			dots: (this.state.dots-1) || this.maxDots
		});
	}
	makeDots(){
		return ".".repeat(this.state.dots);
	}
	render(){
		return (
		<div className="dotHolder">
			{this.props.message}{this.makeDots()}
		</div>);
	}
}

export default Waiting;
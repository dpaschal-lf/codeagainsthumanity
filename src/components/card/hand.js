import React, { Component } from 'react';
import './hand.css';
import Card from './card.js';

class Hand extends Component{
	constructor(props){
		super(props);
		this.state = {
			selectedCards: (new Array(props.cardText.length).fill(false)),
			selectedInOrder: []
		}
		this.handleSubmit = this.handleSubmit.bind(this);
	}
	handleClick( index ){
		if(this.props.submit===undefined){
			return;
		}
		console.log('card '+index + ' got clicked');
		const newSelections = this.state.selectedCards.slice();
		newSelections[index] = !newSelections[index];
		const newSelectionOrder = [...this.state.selectedInOrder];
		if(newSelections[index]){
			newSelectionOrder.push( index );
		} else {
			newSelectionOrder.splice( newSelectionOrder.indexOf(index), 1);
		}
		this.setState({
			selectedCards : newSelections,
			selectedInOrder: newSelectionOrder
		})
	}
	handleSubmit(){
		const selected = this.state.selectedCards
				.map( (state,index) => state?index:false)
				.filter( (selected) => selected!==false)
		this.props.submit(this.state.selectedInOrder);

	}
	renderCards(){

		if(this.props.type==='answer'){
			const selectedOrder = this.state.selectedInOrder.slice();
			return this.props.cardText.map( (text, index)=> <Card key={index} tag={ selectedOrder.indexOf(index)!==-1 ? selectedOrder.indexOf(index)+1 : '' } selected={this.state.selectedCards[index]} index={index} text={text} type={this.props.type} clickHandler={()=>{ this.handleClick(index)}}/>)
		}
		const nextText = this.props.cardText[0].map( item => typeof item==='number' ? this.props.currentAnswers[item] : item).join('');
		return <Card text={nextText} type={this.props.type}/>
		
	}
	render(){
		console.log('selected in order: ', this.state.selectedInOrder);
		return (
			<div className='hand'>
				{this.renderCards()}
				{ this.props.submit!==undefined ? <button onClick={this.handleSubmit}>submit</button>:''}
			</div>
		);
	}
}

export default Hand;


import React from 'react';
import './card.css';

export default function Card(props){
	return (
		<div className={`card ${props.type} ${props.selected ? 'selected': ''}`} onClick={props.clickHandler}>
			<aside className='cardTag'>{props.tag || ''}</aside><span className="text">{props.text}</span>
		</div>
	)
}

import {useState} from 'react';
import {describe,expect,it} from 'vitest';
import {fireEvent,render,screen} from '@testing-library/react';
import {WholeNumberInput} from './whole-number-input';
function Field(){
  const [value,setValue]=useState(0);
  return <WholeNumberInput aria-label="Workload" value={value} onChange={setValue}/>;
}
describe('Whole number demo input',()=>{
  it('keeps a deleted field empty instead of inserting zero',()=>{
    render(<Field/>);
    const input=screen.getByRole('textbox',{name:'Workload'});
    fireEvent.change(input,{target:{value:''}});
    expect(input).toHaveValue('');
    fireEvent.change(input,{target:{value:'123'}});
    expect(input).toHaveValue('123');
  });
  it('normalizes leading zeroes',()=>{
    render(<Field/>);
    const input=screen.getByRole('textbox',{name:'Workload'});
    fireEvent.change(input,{target:{value:'0123'}});
    expect(input).toHaveValue('123');
  });
  it('does not accept decimal punctuation or exponent syntax',()=>{
    render(<Field/>);
    const input=screen.getByRole('textbox',{name:'Workload'});
    fireEvent.change(input,{target:{value:'42'}});
    for(const bad of ['1.5','1,5','1e3','-5','1a']){
      fireEvent.change(input,{target:{value:bad}});
      expect(input).toHaveValue('42');
    }
    expect(input).toHaveAttribute('inputmode','numeric');
  });
  it('does not round numbers outside safe integer range',()=>{
    render(<Field/>);
    const input=screen.getByRole('textbox',{name:'Workload'});
    fireEvent.change(input,{target:{value:'9007199254740993'}});
    expect(input).toHaveValue('0');
  });
});

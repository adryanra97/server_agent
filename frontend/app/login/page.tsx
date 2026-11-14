import DemoLogin from '../../components/demo-login';
import type { Metadata } from 'next';
export const metadata:Metadata={
  title:'Demo Login — ServerAgent',
  description:'Explore ServerAgent from five distinct roles based on the AKPSI functional model.',
};
export default function Page(){return <DemoLogin/>;}

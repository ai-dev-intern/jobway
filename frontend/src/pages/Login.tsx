import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AlertCircle, Lock, Mail } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import './Auth.css';

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? 'http://127.0.0.1:3000' : '');

export default function Login(){
  const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [error,setError]=useState('');const [isLoading,setIsLoading]=useState(false);const navigate=useNavigate();const login=useAuthStore(state=>state.login);
  const handleSubmit=async(event:FormEvent)=>{event.preventDefault();setError('');setIsLoading(true);try{const response=await axios.post(`${API_BASE}/login`,{email,password},{withCredentials:true,timeout:8000});if(response.data?.success&&response.data?.user){login(response.data.user);navigate('/dashboard')}else setError('Account services are not configured for this deployment.')}catch(err:unknown){if(axios.isAxiosError(err))setError(err.response?.data?.error||'Unable to log in. Check your details and try again.');else setError('Unable to log in.')}finally{setIsLoading(false)}};
  return <div className="auth-container container flex-center"><div className="auth-card glass-panel animate-fade-in"><h2 className="auth-title">Welcome back</h2><p className="auth-subtitle">Log in securely to continue your Job Way progress.</p>{error&&<div className="auth-error flex-center" role="alert"><AlertCircle size={18}/><span>{error}</span></div>}<form onSubmit={handleSubmit} className="auth-form"><div className="input-group"><div className="input-icon"><Mail size={18}/></div><input type="email" className="input-field with-icon" placeholder="Email address" value={email} onChange={event=>setEmail(event.target.value)} autoComplete="email" maxLength={254} required/></div><div className="input-group"><div className="input-icon"><Lock size={18}/></div><input type="password" className="input-field with-icon" placeholder="Password" value={password} onChange={event=>setPassword(event.target.value)} autoComplete="current-password" maxLength={128} required/></div><button type="submit" className="btn-primary auth-submit" disabled={isLoading}>{isLoading?'Logging in…':'Log in'}</button></form><div className="auth-footer"><p>Don’t have an account? <Link to="/signup">Sign up</Link></p></div></div></div>;
}

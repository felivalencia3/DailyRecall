import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './auth.scss';

export function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  
  const { signIn, signUp } = useAuth();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);
    
    try {
      if (mode === 'signIn') {
        await signIn(email, password);
      } else {
        // Validate password match for sign up
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        
        // Sign up the user
        await signUp(email, password);
        
        // Show success message
        setSuccessMessage(
          `Success! Please check your email (${email}) to confirm your account. ` +
          `The confirmation link has been sent. After confirming, you can sign in.`
        );
        
        // Reset the form
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      let errorMessage = err.message || 'An error occurred';
      
      // Make error messages more user-friendly
      if (errorMessage.includes('User already registered')) {
        errorMessage = 'This email is already registered. Try signing in instead.';
      } else if (errorMessage.includes('Invalid login credentials')) {
        errorMessage = 'Incorrect email or password. Please try again.';
      } else if (errorMessage.includes('Email not confirmed')) {
        errorMessage = 'Please confirm your email before signing in. Check your inbox for the confirmation link.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const toggleMode = () => {
    setError(null);
    setSuccessMessage(null);
    setMode(mode === 'signIn' ? 'signUp' : 'signIn');
  };
  
  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-illustration">
          <div className="illustration-content">
            <div className="logo">DailyRecall</div>
            <h1>Remember every moment that matters</h1>
            <p>Your reliable companion for tracking daily activities and building healthy routines.</p>
            <div className="illustration-image"></div>
          </div>
        </div>
        
        <div className="auth-form-container">
          <div className="auth-form-content">
            <div className="auth-header">
              <h2>{mode === 'signIn' ? 'Welcome Back' : 'Create Account'}</h2>
              <p>{mode === 'signIn' 
                ? 'Sign in to continue your journey' 
                : 'Join us to start tracking your daily activities'}</p>
            </div>
            
            {error && (
              <div className="auth-error">
                <div className="message-icon">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C6.477 22 2 17.523 2 12C2 6.477 6.477 2 12 2C17.523 2 22 6.477 22 12C22 17.523 17.523 22 12 22ZM11 15V17H13V15H11ZM11 7V13H13V7H11Z" fill="currentColor"/>
                  </svg>
                </div>
                <div className="message-content">{error}</div>
              </div>
            )}
            
            {successMessage && (
              <div className="auth-success">
                <div className="message-icon">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C6.477 22 2 17.523 2 12C2 6.477 6.477 2 12 2C17.523 2 22 6.477 22 12C22 17.523 17.523 22 12 22ZM11.003 16L18.073 8.929L16.659 7.515L11.003 13.172L8.174 10.343L6.76 11.757L11.003 16Z" fill="currentColor"/>
                  </svg>
                </div>
                <div className="message-content">{successMessage}</div>
              </div>
            )}
            
            {successMessage && mode === 'signUp' ? (
              <div className="auth-actions">
                <button 
                  className="auth-button primary" 
                  onClick={toggleMode}
                >
                  Go to Sign In
                </button>
                <button 
                  className="auth-button secondary" 
                  onClick={() => window.open('https://mail.google.com', '_blank')}
                >
                  Open Gmail
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <div className="input-container">
                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3ZM12.0601 11.7L5.648 6.2392L4.35193 7.7608L12.0599 14.3L19.6506 7.7645L18.3494 6.2355L12.0601 11.7Z" fill="currentColor"/>
                    </svg>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      required
                      placeholder="your.email@example.com"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <div className="input-container">
                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19 10H20C20.5523 10 21 10.4477 21 11V21C21 21.5523 20.5523 22 20 22H4C3.44772 22 3 21.5523 3 21V11C3 10.4477 3.44772 10 4 10H5V9C5 5.13401 8.13401 2 12 2C15.866 2 19 5.13401 19 9V10ZM5 12V20H19V12H5ZM17 10V9C17 6.23858 14.7614 4 12 4C9.23858 4 7 6.23858 7 9V10H17ZM13 16C13 16.5523 12.5523 17 12 17C11.4477 17 11 16.5523 11 16C11 15.4477 11.4477 15 12 15C12.5523 15 13 15.4477 13 16Z" fill="currentColor"/>
                    </svg>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      placeholder="Enter your password"
                    />
                  </div>
                </div>
                
                {mode === 'signUp' && (
                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <div className="input-container">
                      <svg className="input-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 10H20C20.5523 10 21 10.4477 21 11V21C21 21.5523 20.5523 22 20 22H4C3.44772 22 3 21.5523 3 21V11C3 10.4477 3.44772 10 4 10H5V9C5 5.13401 8.13401 2 12 2C15.866 2 19 5.13401 19 9V10ZM5 12V20H19V12H5ZM17 10V9C17 6.23858 14.7614 4 12 4C9.23858 4 7 6.23858 7 9V10H17ZM13 16C13 16.5523 12.5523 17 12 17C11.4477 17 11 16.5523 11 16C11 15.4477 11.4477 15 12 15C12.5523 15 13 15.4477 13 16Z" fill="currentColor"/>
                      </svg>
                      <input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isLoading}
                        required
                        placeholder="Re-enter your password"
                      />
                    </div>
                  </div>
                )}
                
                <button 
                  type="submit" 
                  className={`auth-button primary ${mode === 'signUp' ? 'signup-button' : ''}`} 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="button-with-loader">
                      <span className="loader"></span>
                      <span>Processing...</span>
                    </span>
                  ) : (
                    mode === 'signIn' ? 'Sign In' : 'Create Account'
                  )}
                </button>
                
                <div className="auth-footer">
                  {mode === 'signIn' ? (
                    <p>
                      Don't have an account?{' '}
                      <button 
                        type="button" 
                        className="auth-link"
                        onClick={toggleMode}
                        disabled={isLoading}
                      >
                        Sign Up
                      </button>
                    </p>
                  ) : (
                    <p>
                      Already have an account?{' '}
                      <button 
                        type="button" 
                        className="auth-link"
                        onClick={toggleMode}
                        disabled={isLoading}
                      >
                        Sign In
                      </button>
                    </p>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

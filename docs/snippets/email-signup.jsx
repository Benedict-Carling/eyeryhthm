import { useState } from 'react';

export const EmailSignupForm = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      setStatus('error');
      setMessage('Please enter your email address');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('https://eyeryhthm.vercel.app/api/mailerlite/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name }),
      });

      const result = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('Thanks for subscribing! We\'ll keep you updated.');
        setEmail('');
        setName('');
      } else {
        setStatus('error');
        setMessage(result.error || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Network error. Please check your connection and try again.');
    }
  };

  if (status === 'success') {
    return (
      <div style={{
        padding: '24px',
        borderRadius: '12px',
        backgroundColor: '#dcfce7',
        border: '1px solid #86efac',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>&#10003;</div>
        <p style={{ margin: 0, color: '#166534', fontWeight: 500 }}>
          {message}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label htmlFor="signup-name" style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>
          Name (optional)
        </label>
        <input
          id="signup-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            fontSize: '16px',
            boxSizing: 'border-box'
          }}
        />
      </div>
      <div>
        <label htmlFor="signup-email" style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>
          Email address *
        </label>
        <input
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            fontSize: '16px',
            boxSizing: 'border-box'
          }}
        />
      </div>
      {status === 'error' && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          fontSize: '14px'
        }}>
          {message}
        </div>
      )}
      <button
        type="submit"
        disabled={status === 'loading'}
        style={{
          padding: '12px 24px',
          borderRadius: '8px',
          backgroundColor: status === 'loading' ? '#9ca3af' : '#3E63DD',
          color: '#fff',
          border: 'none',
          fontSize: '16px',
          fontWeight: 600,
          cursor: status === 'loading' ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s'
        }}
      >
        {status === 'loading' ? 'Subscribing...' : 'Subscribe to newsletter'}
      </button>
      <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', textAlign: 'left' }}>
        We respect your privacy. Unsubscribe anytime.
      </p>
    </form>
  );
};

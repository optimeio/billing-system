import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2, KeyRound, RefreshCw, Eye, EyeOff, CheckCircle } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';

const Login = () => {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // First login force change password state
  const [firstLoginData, setFirstLoginData] = useState(null);
  const [firstLoginStep, setFirstLoginStep] = useState(0); // 0 = send OTP, 1 = verify & set new password
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [timer, setTimer] = useState(60);

  // Forgot password state
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState(0);

  const navigate = useNavigate();
  const { login } = useAuthStore();

  useEffect(() => {
    let interval;
    // Active countdown when on first-login OTP step OR forgot-password OTP step
    const isTimerActive = (firstLoginStep === 1) || (isForgotPassword && forgotPasswordStep === 1);
    
    if (isTimerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [firstLoginStep, isForgotPassword, forgotPasswordStep, timer]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const response = await api.post('/auth/login', { loginId, password });
      // Backend now returns { message, token, user }
      const { token, user, message } = response.data;

      if (user.isFirstLogin) {
        setFirstLoginData({ user, token });
        setFirstLoginStep(0);
        return;
      }

      setSuccessMsg(message || 'Login Successful');
      login(user, token);

      // Short delay so the user sees the success message
      setTimeout(() => {
        const role = user.role?.toLowerCase().trim() || '';
        if (role === 'admin') navigate('/admin');
        else if (role === 'inventory') navigate('/inventory');
        else navigate('/staff');
      }, 800);

    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (isResend = false) => {
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/send-first-login-otp', {}, {
        headers: { Authorization: `Bearer ${firstLoginData.token}` }
      });
      setFirstLoginStep(1); // Move to OTP verification step
      setTimer(60); // Reset timer
      if (isResend) {
        // You can optionally show a toast here
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) {
      return setError('Please enter the OTP sent to your email');
    }

    setLoading(true);
    setError('');
    try {
      await api.post('/auth/verify-otp', { email: firstLoginData.user.email, otp });
      setFirstLoginStep(2); // Move to set password step
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP code');
    } finally {
      setLoading(false);
    }
  };

  const handleFirstLoginChange = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match');
    }
    if (newPassword.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/first-login-change',
        { otp, newPassword },
        { headers: { Authorization: `Bearer ${firstLoginData.token}` } }
      );

      const { user } = response.data;

      // Update store and redirect based on normalized role
      login(user, firstLoginData.token);
      const r = user.role?.toLowerCase().trim() || '';
      if (r === 'admin') navigate('/admin');
      else if (r === 'inventory') navigate('/inventory');
      else navigate('/staff');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordRequest = async (e, isResend = false) => {
    if (e) e.preventDefault();
    if (!loginId) return setError('Please enter your Email or Staff ID');

    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { loginId });
      setForgotPasswordStep(1);
      setTimer(60);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyForgotOtp = async (e) => {
    e.preventDefault();
    if (!otp) return setError('Please enter the OTP');

    setLoading(true);
    setError('');
    try {
      await api.post('/auth/verify-otp', { loginId, otp });
      setForgotPasswordStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return setError('Passwords do not match');
    if (newPassword.length < 6) return setError('Password must be at least 6 characters');

    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { loginId, otp, newPassword });
      // Reset all forgot-password state and show success on the main login form
      setIsForgotPassword(false);
      setForgotPasswordStep(0);
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setPassword('');
      setSuccessMsg('Password reset successful! Please sign in with your new password.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (firstLoginData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-auto p-6 md:p-8 bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-xl shadow-slate-200/50"
      >
        <div className="text-center mb-6 md:mb-8">
          <img src="/logo.png" alt="SM Groups" className="h-16 md:h-20 mx-auto mb-6 object-contain drop-shadow-lg" />
          <div className="mx-auto w-14 h-14 bg-red-50 border border-red-100 text-primary rounded-full flex items-center justify-center mb-4 shadow-sm">
            <KeyRound size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">Update Password</h1>
          <p className="text-sm text-slate-500">
            For security reasons, please change your temporary password before continuing.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm backdrop-blur-sm">
            {error}
          </div>
        )}

        {firstLoginStep === 0 && (
          <div className="space-y-6">
            <p className="text-sm text-slate-600 text-center leading-relaxed">
              We will send a 6-digit security code to your registered email address to verify your identity.
            </p>
            <button
              onClick={() => handleSendOtp(false)}
              disabled={loading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-primary/20 text-sm font-bold text-white bg-primary hover:bg-red-700 transition-all hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100"
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Send OTP to Email'}
            </button>
          </div>
        )}

        {firstLoginStep === 1 && (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-700">Security Code (OTP)</label>
                <button
                  type="button"
                  onClick={() => handleSendOtp(true)}
                  disabled={timer > 0 || loading}
                  className="text-xs font-bold flex items-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-primary hover:text-red-400"
                >
                  <RefreshCw size={12} className={`mr-1 ${loading && 'animate-spin'}`} />
                  {timer > 0 ? `Resend in ${timer}s` : 'Resend OTP'}
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary text-slate-900 tracking-widest font-mono transition-all outline-none placeholder:text-slate-400"
                  placeholder="Enter 6-digit OTP"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-primary/20 text-sm font-bold text-white bg-primary hover:bg-red-700 transition-all hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100"
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Verify OTP'}
            </button>
          </form>
        )}

        {firstLoginStep === 2 && (
          <form onSubmit={handleFirstLoginChange} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary text-slate-900 transition-all outline-none placeholder:text-slate-400"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary text-slate-900 transition-all outline-none placeholder:text-slate-400"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-primary/20 text-sm font-bold text-white bg-primary hover:bg-red-700 transition-all hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100"
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Update Password & Login'}
            </button>
          </form>
        )}
      </motion.div>
    );
  }

  if (isForgotPassword) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-auto p-6 md:p-8 bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-xl shadow-slate-200/50"
      >
        <div className="text-center mb-6 md:mb-8">
          <img src="/logo.png" alt="SM Groups" className="h-16 md:h-20 mx-auto mb-6 object-contain drop-shadow-lg" />
          <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Reset Password</h1>
          <p className="text-slate-500">
            Recover access to your account
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm font-medium flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        {forgotPasswordStep === 0 && (
          <form onSubmit={(e) => handleForgotPasswordRequest(e, false)} className="space-y-6">
            <div>
              <label htmlFor="resetLoginId" className="block text-sm font-medium text-slate-700 mb-2">Email or Staff ID</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="resetLoginId"
                  type="text"
                  required
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary text-slate-900 transition-all outline-none placeholder:text-slate-400"
                  placeholder="Enter your email or ID"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-primary/20 text-sm font-bold text-white bg-primary hover:bg-red-700 transition-all hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100"
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Send Reset Code'}
            </button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => { setIsForgotPassword(false); setError(''); }}
                className="text-sm text-slate-500 hover:text-primary transition-colors"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}

        {forgotPasswordStep === 1 && (
          <form onSubmit={handleVerifyForgotOtp} className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-700">Security Code (OTP)</label>
                <button
                  type="button"
                  onClick={(e) => handleForgotPasswordRequest(e, true)}
                  disabled={timer > 0 || loading}
                  className="text-xs font-bold flex items-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-primary hover:text-red-400"
                >
                  <RefreshCw size={12} className={`mr-1 ${loading && 'animate-spin'}`} />
                  {timer > 0 ? `Resend in ${timer}s` : 'Resend OTP'}
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary text-slate-900 tracking-widest font-mono transition-all outline-none placeholder:text-slate-400"
                  placeholder="Enter 6-digit code"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-primary/20 text-sm font-bold text-white bg-primary hover:bg-red-700 transition-all hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100"
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Verify Code'}
            </button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => { setIsForgotPassword(false); setForgotPasswordStep(0); setError(''); }}
                className="text-sm text-slate-500 hover:text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {forgotPasswordStep === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary text-slate-900 transition-all outline-none placeholder:text-slate-400"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary text-slate-900 transition-all outline-none placeholder:text-slate-400"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-primary/20 text-sm font-bold text-white bg-primary hover:bg-red-700 transition-all hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100"
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Set New Password'}
            </button>
          </form>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto p-6 md:p-8 bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-xl shadow-slate-200/50"
    >
      <div className="text-center mb-6 md:mb-8">
        <img src="/logo.png" alt="SM Groups" className="h-16 md:h-20 mx-auto mb-4 md:mb-6 object-contain drop-shadow-lg" />
        <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Welcome Back</h1>
        <p className="text-slate-500">Sign in to your account</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm font-medium flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm font-medium flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0" /> {successMsg}
        </div>
      )}


      <form onSubmit={handleLogin} className="space-y-6" aria-label="Login Form">
        <div>
          <label htmlFor="loginId" className="block text-sm font-medium text-slate-700 mb-2">Email or Staff ID</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-slate-400" aria-hidden="true" />
            </div>
            <input
              id="loginId"
              type="text"
              required
              aria-required="true"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary text-slate-900 transition-all outline-none placeholder:text-slate-400"
              placeholder="Enter your email or ID"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-slate-400" aria-hidden="true" />
            </div>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              aria-required="true"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary text-slate-900 transition-all outline-none placeholder:text-slate-400"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center">
            <input id="remember-me" type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-slate-200 bg-slate-50 rounded" />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600">Remember me</label>
          </div>
          <div className="text-sm">
            <button
              type="button"
              onClick={() => { setIsForgotPassword(true); setError(''); setOtp(''); setNewPassword(''); setConfirmPassword(''); }}
              className="font-medium text-primary hover:text-red-400 focus:outline-none focus:underline bg-transparent border-none cursor-pointer transition-colors"
            >
              Forgot password?
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-primary/20 text-sm font-bold text-white bg-primary hover:bg-red-700 transition-all hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="animate-spin h-5 w-5" aria-hidden="true" /> : 'Sign in'}
        </button>
      </form>
    </motion.div>
  );
};

export default Login;

import LoginForm from '../components/Auth/LoginForm';
import logo from '../assets/logo.jpeg';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-2">
          <img src={logo} alt="RadVision" className="h-10 w-10 rounded object-cover" />
          <h1 className="text-2xl font-bold text-blue-700">RadVision</h1>
        </div>
        <p className="text-center text-gray-500 mb-6">ICD-10 Kodlama Platforması</p>
        <LoginForm />
      </div>
    </div>
  );
}

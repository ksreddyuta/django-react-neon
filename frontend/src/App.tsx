// Remove the React import since we're not using it directly
import { Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';
import { DashboardPage } from './pages/DashboardPage';
import { PublicContentPage } from './pages/PublicContentPage';
import { Layout } from './components/layout/Layout';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/public" element={<PublicContentPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
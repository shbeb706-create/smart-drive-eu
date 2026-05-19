import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import NavigationPage from './pages/Navigation';
import RoutePlanner from './pages/RoutePlanner';
import { SettingsContext, useSettingsProvider } from './hooks/useSettings';

export default function App() {
  const settingsProvider = useSettingsProvider();

  return (
    <SettingsContext.Provider value={settingsProvider}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/navigation" element={<NavigationPage />} />
            <Route path="/route-planner" element={<RoutePlanner />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SettingsContext.Provider>
  );
}
